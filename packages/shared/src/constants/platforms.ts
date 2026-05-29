export const PLATFORM_NAMES = {
  META: 'Meta Ads',
  GOOGLE: 'Google Ads',
  TIKTOK: 'TikTok Ads',
  SNAP: 'Snap Ads',
  LINKEDIN: 'LinkedIn Ads',
} as const;

export const PLATFORM_COLORS = {
  META: '#1877f2',
  GOOGLE: '#4285f4',
  TIKTOK: '#ff0050',
  SNAP: '#fffc00',
  LINKEDIN: '#0a66c2',
} as const;

export const CAMPAIGN_OBJECTIVES = [
  { value: 'AWARENESS', label: 'Awareness', description: 'Increase brand recognition' },
  { value: 'TRAFFIC', label: 'Traffic', description: 'Drive visitors to your website' },
  { value: 'ENGAGEMENT', label: 'Engagement', description: 'Get more post engagements' },
  { value: 'LEADS', label: 'Leads', description: 'Collect leads for your business' },
  { value: 'SALES', label: 'Sales', description: 'Drive conversions and sales' },
  { value: 'APP_PROMOTION', label: 'App Promotion', description: 'Promote your mobile app' },
  { value: 'RETENTION', label: 'Retention', description: 'Re-engage existing customers' },
] as const;
