/**
 * Shared platform metadata — labels, brand color tokens, and the set of
 * supported ad platforms. Single source of truth for the UI so integrations,
 * onboarding, and campaign surfaces stay consistent.
 */

export type PlatformId = 'meta' | 'google' | 'tiktok' | 'snap';

export interface PlatformMeta {
  id: PlatformId;
  label: string;
  /** Tailwind text/bg helpers backed by the --platform-* tokens. */
  colorVar: string;
  description: string;
}

export const PLATFORMS: Record<PlatformId, PlatformMeta> = {
  meta: {
    id: 'meta',
    label: 'Meta Ads',
    colorVar: 'var(--platform-meta)',
    description: 'Facebook & Instagram campaigns',
  },
  google: {
    id: 'google',
    label: 'Google Ads',
    colorVar: 'var(--platform-google)',
    description: 'Search, Display & YouTube',
  },
  tiktok: {
    id: 'tiktok',
    label: 'TikTok Ads',
    colorVar: 'var(--platform-tiktok)',
    description: 'TikTok For Business campaigns',
  },
  snap: {
    id: 'snap',
    label: 'Snapchat Ads',
    colorVar: 'var(--platform-snap)',
    description: 'Snap Ads Manager campaigns',
  },
};

export const PLATFORM_IDS = Object.keys(PLATFORMS) as PlatformId[];

export function platformLabel(id: string): string {
  return PLATFORMS[id as PlatformId]?.label ?? id;
}

export function platformColor(id: string): string {
  const meta = PLATFORMS[id as PlatformId];
  return meta ? `hsl(${meta.colorVar})` : 'hsl(var(--muted-foreground))';
}
