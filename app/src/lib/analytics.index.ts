// @ts-nocheck
// ============================================================================
// Analytics — barrel exports
// ============================================================================

// Core service
export { analytics } from './analytics';
export type {
  AnalyticsConfig,
  AnalyticsEvent,
  AnalyticsUserTraits,
  EventProperties,
  CampaignCreateProps,
  DraftDecisionProps,
  AiRuleToggleProps,
  ReportGenerateProps,
  FeatureUseProps,
  ErrorProps,
} from './analytics.types';

// Event constants
export {
  PAGE_EVENTS,
  AUTH_EVENTS,
  CAMPAIGN_EVENTS,
  DRAFT_EVENTS,
  AI_EVENTS,
  REPORT_EVENTS,
  FEATURE_EVENTS,
  BILLING_EVENTS,
  COLLAB_EVENTS,
} from './analytics.types';

// React hooks
export {
  useAnalytics,
  usePageView,
  useTrackEvent,
} from '@/hooks/useAnalytics';
export type { UseAnalyticsOptions } from '@/hooks/useAnalytics';
