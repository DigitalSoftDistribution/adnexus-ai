// @ts-nocheck
// ============================================================================
// useAnalytics Hook
// ============================================================================
// React hook for analytics tracking. Automatically tracks page views on
// route changes when initialized with `trackPages: true`.
//
// Usage:
//   const { track, identify, page, error, isActive } = useAnalytics();
//
//   // In an event handler:
//   track('campaign_create', { name: 'Summer Sale', channel: 'email' });
//
//   // On user login:
//   identify(user.id, { email: user.email, plan: user.plan });
//
//   // Track a custom page view:
//   page('/custom-path', { section: 'billing' });
//
//   // Track an error:
//   error(new Error('Failed to save'), { component: 'CampaignForm' });
// ============================================================================

import { useCallback, useEffect, useRef } from 'react';
import { analytics } from '@/lib/analytics';
import type {
  AnalyticsEvent,
  EventProperties,
  AnalyticsUserTraits,
  CampaignCreateProps,
  DraftDecisionProps,
  AiRuleToggleProps,
  ReportGenerateProps,
  FeatureUseProps,
  ErrorProps,
  CAMPAIGN_EVENTS,
  DRAFT_EVENTS,
  AI_EVENTS,
  REPORT_EVENTS,
  AUTH_EVENTS,
  FEATURE_EVENTS,
} from '@/lib/analytics.types';

// ---------------------------------------------------------------------------
// Hook options
// ---------------------------------------------------------------------------

export interface UseAnalyticsOptions {
  /** Auto-track page views on mount / route change */
  trackPages?: boolean;
  /** Extra context merged into every event from this component */
  context?: EventProperties;
  /** Component name for automatic error boundary integration */
  component?: string;
}

// ---------------------------------------------------------------------------
// useAnalytics hook
// ---------------------------------------------------------------------------

export function useAnalytics(options: UseAnalyticsOptions = {}) {
  const { trackPages = false, context = {}, component } = options;
  const contextRef = useRef(context);
  contextRef.current = context;

  // Ensure analytics service is initialized once
  useEffect(() => {
    analytics.init();
  }, []);

  // Auto-track page views when enabled
  useEffect(() => {
    if (!trackPages || typeof window === 'undefined') return;

    // Track initial page
    analytics.page(window.location.pathname, contextRef.current);

    // Listen for SPA route changes (works with React Router, Next.js, etc.)
    const handleRouteChange = () => {
      analytics.page(window.location.pathname, {
        ...contextRef.current,
        referrer: document.referrer,
      });
    };

    // React Router v6+ and Next.js both dispatch popstate / pushstate events
    window.addEventListener('popstate', handleRouteChange);

    // Monkey-patch pushState/replaceState to detect programmatic navigations
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function patchPushState(...args) {
      originalPushState.apply(this, args);
      handleRouteChange();
    };
    window.history.replaceState = function patchReplaceState(...args) {
      originalReplaceState.apply(this, args);
      handleRouteChange();
    };

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, [trackPages]);

  // --- Core tracking callbacks ------------------------------------------------

  /** Track any event */
  const track = useCallback(
    (event: AnalyticsEvent, properties?: EventProperties) => {
      analytics.track(event, {
        ...contextRef.current,
        ...(component ? { component } : {}),
        ...properties,
      });
    },
    [component],
  );

  /** Identify the current user */
  const identify = useCallback((userId: string, traits?: AnalyticsUserTraits) => {
    analytics.identify(userId, traits);
  }, []);

  /** Track a page view manually */
  const page = useCallback((name?: string, properties?: EventProperties) => {
    analytics.page(name, { ...contextRef.current, ...properties });
  }, []);

  /** Track an error */
  const error = useCallback(
    (err: Error, extra?: Omit<ErrorProps, 'message' | 'name' | 'stack'>) => {
      analytics.error(err, {
        component,
        ...contextRef.current,
        ...extra,
      });
    },
    [component],
  );

  // --- Semantic convenience trackers ------------------------------------------

  /** Track a campaign creation event */
  const trackCampaignCreate = useCallback(
    (props: CampaignCreateProps) => {
      analytics.track('campaign_create', {
        ...contextRef.current,
        ...props,
      });
    },
    [],
  );

  /** Track a draft approval or rejection */
  const trackDraftDecision = useCallback(
    (props: DraftDecisionProps) => {
      const event = props.decision === 'approved' ? 'draft_approve' : 'draft_reject';
      analytics.track(event, {
        ...contextRef.current,
        ...props,
      });
    },
    [],
  );

  /** Track an AI rule toggle (enable/disable) */
  const trackAiRuleToggle = useCallback(
    (props: AiRuleToggleProps) => {
      analytics.track('ai_rule_toggle', {
        ...contextRef.current,
        ...props,
      });
    },
    [],
  );

  /** Track an AI rule creation */
  const trackAiRuleCreate = useCallback(
    (props: { ruleId: string; ruleName: string; triggerType: string; actions: string[] }) => {
      analytics.track('ai_rule_create', {
        ...contextRef.current,
        ...props,
      });
    },
    [],
  );

  /** Track a report generation */
  const trackReportGenerate = useCallback(
    (props: ReportGenerateProps) => {
      analytics.track('report_generate', {
        ...contextRef.current,
        ...props,
      });
    },
    [],
  );

  /** Track an export download */
  const trackExportDownload = useCallback(
    (props: { reportId: string; format: 'pdf' | 'csv' | 'excel'; fileSize?: number }) => {
      const eventMap = {
        pdf: 'export_pdf',
        csv: 'export_csv',
        excel: 'export_excel',
      };
      analytics.track(eventMap[props.format], {
        ...contextRef.current,
        ...props,
      });
    },
    [],
  );

  /** Track feature usage (command palette, shortcuts, etc.) */
  const trackFeature = useCallback(
    (props: FeatureUseProps) => {
      analytics.track(`feature_${props.feature}`, {
        ...contextRef.current,
        ...props,
      });
    },
    [],
  );

  /** Track authentication events (sign_up / sign_in) */
  const trackAuth = useCallback(
    (event: 'sign_up' | 'sign_in' | 'sign_out', props?: { method?: string; provider?: string }) => {
      analytics.track(event, {
        ...contextRef.current,
        ...props,
      });
    },
    [],
  );

  // --- Lifecycle helpers ------------------------------------------------------

  /** Reset / logout the current user */
  const reset = useCallback(() => {
    analytics.reset();
  }, []);

  /** Check if analytics tracking is currently active */
  const isActive = analytics.isActive();

  /** Get the current provider name */
  const provider = analytics.getProvider();

  /** User opt-out (GDPR) */
  const optOut = useCallback(() => {
    analytics.optOut();
  }, []);

  /** User opt-in */
  const optIn = useCallback(() => {
    analytics.optIn();
  }, []);

  return {
    // Core
    track,
    identify,
    page,
    error,
    reset,

    // Semantic helpers
    trackCampaignCreate,
    trackDraftDecision,
    trackAiRuleToggle,
    trackAiRuleCreate,
    trackReportGenerate,
    trackExportDownload,
    trackFeature,
    trackAuth,

    // State
    isActive,
    provider,
    optOut,
    optIn,
  };
}

// ---------------------------------------------------------------------------
// usePageView hook — lightweight standalone page view tracker
// ---------------------------------------------------------------------------

export function usePageView(
  pageName?: string,
  properties?: EventProperties,
  deps: React.DependencyList = [],
) {
  useEffect(() => {
    analytics.page(pageName ?? window.location.pathname, properties);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// ---------------------------------------------------------------------------
// useTrackEvent hook — one-shot event tracking on mount or dependency change
// ---------------------------------------------------------------------------

export function useTrackEvent(
  event: AnalyticsEvent,
  properties?: EventProperties,
  deps: React.DependencyList = [],
) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    analytics.track(event, properties);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
