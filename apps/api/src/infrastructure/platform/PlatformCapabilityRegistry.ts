import type {
  IAdPlatformCapabilities,
  AdPlatformCapabilities,
  PlatformFeatureName,
  FeatureState,
} from '../../application/ports/AdPlatformCapabilities';
import type { Platform } from '../../domain/entities/Campaign';
import type { ISettingsRepository } from '../../domain/repositories/ISettingsRepository';

/**
 * Maps the `ENABLE_<PLATFORM>_LIVE` env var to a FeatureState.
 *
 * - unset / `'false'` → `'mock'` (default: mock in dev/preview, safe)
 * - `'true'` → `'live'`
 * - `'mock'` → `'mock'`
 */
function resolveLiveEnvVar(platform: Platform): FeatureState {
  const key = `ENABLE_${platform.toUpperCase()}_LIVE`;
  const raw = process.env[key];
  if (raw === 'true') return 'live';
  if (raw === 'mock') return 'mock';
  if (raw === 'false') return false;
  // Default: mock in all environments until explicitly opted into live.
  return 'mock';
}

const ALL_FEATURES: PlatformFeatureName[] = [
  'sync',
  'write',
  'insights',
  'oauth',
  'campaign_management',
  'ad_management',
  'audience_management',
  'reporting',
];

const SUPPORTED_PLATFORMS: Platform[] = ['meta', 'google', 'tiktok', 'snap'];

/**
 * Computes the feature map for a single platform based on:
 *   1. Environment toggle (ENABLE_<PLATFORM>_LIVE → 'live' | 'mock' | false)
 *   2. OAuth connection state (connected → inherit env toggle; disconnected → all false)
 */
function computeFeatures(
  platform: Platform,
  connected: boolean,
): Record<PlatformFeatureName, FeatureState> {
  const baseState = resolveLiveEnvVar(platform);
  const state: FeatureState = connected ? baseState : false;

  const features = {} as Record<PlatformFeatureName, FeatureState>;
  for (const f of ALL_FEATURES) {
    features[f] = state;
  }
  return features;
}

/**
 * Default implementation of IAdPlatformCapabilities.
 *
 * On startup, registers platform-specific feature maps. Query methods check
 * the workspace's OAuth connection state via the settings repository and
 * merge it with environment-based defaults.
 */
export class PlatformCapabilityRegistry implements IAdPlatformCapabilities {
  constructor(private readonly settingsRepo: ISettingsRepository) {}

  async getCapabilities(
    workspaceId: string,
    platform: Platform,
  ): Promise<AdPlatformCapabilities> {
    const integration = await this.settingsRepo.getIntegration(workspaceId, platform);
    const connected = Boolean(
      integration && integration.status === 'connected',
    );
    return {
      platform,
      connected,
      features: computeFeatures(platform, connected),
      lastRefreshed: integration?.lastSyncedAt ?? null,
    };
  }

  async getAllCapabilities(workspaceId: string): Promise<AdPlatformCapabilities[]> {
    const results = await Promise.all(
      SUPPORTED_PLATFORMS.map((p) => this.getCapabilities(workspaceId, p)),
    );
    return results;
  }

  async isFeatureEnabled(
    workspaceId: string,
    platform: Platform,
    feature: PlatformFeatureName,
  ): Promise<boolean> {
    const cap = await this.getCapabilities(workspaceId, platform);
    return cap.features[feature] !== false;
  }

  async isFeatureLive(
    workspaceId: string,
    platform: Platform,
    feature: PlatformFeatureName,
  ): Promise<boolean> {
    const cap = await this.getCapabilities(workspaceId, platform);
    return cap.features[feature] === 'live';
  }
}
