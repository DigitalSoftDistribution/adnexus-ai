// @ts-nocheck
// ============================================================================
// Analytics Service
// ============================================================================
// Multi-provider analytics with privacy-respecting defaults.
// Supports: Segment, Mixpanel, Plausible, and self-hosted providers.
// Respects Do Not Track (DNT) headers and GDPR opt-out.
//
// ENV configuration:
//   VITE_ANALYTICS_PROVIDER=segment|mixpanel|plausible|self-hosted|none
//   VITE_ANALYTICS_API_KEY=<key>
//   VITE_ANALYTICS_ENDPOINT=<custom endpoint for self-hosted>
//   VITE_ANALYTICS_DEBUG=true|false
//
// Usage:
//   import { analytics } from '@/lib/analytics';
//   analytics.track('campaign_create', { name: 'Summer Sale' });
//   analytics.identify('user-123', { email: 'a@b.com' });
//   analytics.page('/dashboard');
// ============================================================================

import { AnalyticsEvent, AnalyticsUserTraits, EventProperties, AnalyticsConfig } from './analytics.types';

// ---------------------------------------------------------------------------
// Environment-derived configuration
// ---------------------------------------------------------------------------

function getConfig(): AnalyticsConfig {
  const provider = (import.meta.env?.VITE_ANALYTICS_PROVIDER ?? 'none').toLowerCase();
  return {
    provider: ['segment', 'mixpanel', 'plausible', 'self-hosted'].includes(provider) ? provider : 'none',
    apiKey: import.meta.env?.VITE_ANALYTICS_API_KEY ?? '',
    endpoint: import.meta.env?.VITE_ANALYTICS_ENDPOINT ?? '',
    debug: import.meta.env?.VITE_ANALYTICS_DEBUG === 'true',
    appVersion: import.meta.env?.VITE_APP_VERSION ?? 'unknown',
    environment: import.meta.env?.MODE ?? 'development',
  };
}

// ---------------------------------------------------------------------------
// Privacy helpers
// ---------------------------------------------------------------------------

function isDntEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const dnt =
    (window.navigator as any).doNotTrack ??
    (window as any).doNotTrack ??
    (window.navigator as any).msDoNotTrack;
  return dnt === '1' || dnt === 'yes' || dnt === true;
}

function isGdprOptedOut(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('analytics_opt_out') === 'true';
}

function shouldTrack(): boolean {
  const cfg = getConfig();
  if (cfg.provider === 'none') return false;
  if (isDntEnabled()) return false;
  if (isGdprOptedOut()) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Device / context enrichment
// ---------------------------------------------------------------------------

function getContext() {
  if (typeof window === 'undefined') return {};
  return {
    url: window.location.href,
    path: window.location.pathname,
    referrer: document.referrer || undefined,
    title: document.title,
    userAgent: navigator.userAgent,
    language: navigator.language,
    screen: {
      width: window.screen.width,
      height: window.screen.height,
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    tzOffset: new Date().getTimezoneOffset(),
  };
}

// ---------------------------------------------------------------------------
// Provider: Segment
// ---------------------------------------------------------------------------

class SegmentProvider {
  private cfg: AnalyticsConfig;
  private ready = false;

  constructor(cfg: AnalyticsConfig) {
    this.cfg = cfg;
  }

  async init() {
    if (this.ready || typeof window === 'undefined') return;
    await this.loadScript();
    this.ready = true;
    if (this.cfg.debug) console.debug('[Analytics:Segment] initialized');
  }

  private loadScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any).analytics) { resolve(); return; }
      const script = document.createElement('script');
      script.src = `https://cdn.segment.com/analytics.js/v1/${this.cfg.apiKey}/analytics.min.js`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Segment'));
      document.head.appendChild(script);
    });
  }

  track(event: string, properties?: EventProperties) {
    if (!this.ready) return;
    try {
      (window as any).analytics?.track(event, { ...properties, ...getContext() });
    } catch (e) {
      if (this.cfg.debug) console.error('[Analytics:Segment] track error:', e);
    }
  }

  identify(userId: string, traits?: AnalyticsUserTraits) {
    if (!this.ready) return;
    try {
      (window as any).analytics?.identify(userId, { ...traits, ...getContext() });
    } catch (e) {
      if (this.cfg.debug) console.error('[Analytics:Segment] identify error:', e);
    }
  }

  page(name?: string, properties?: EventProperties) {
    if (!this.ready) return;
    try {
      (window as any).analytics?.page(name, { ...properties, ...getContext() });
    } catch (e) {
      if (this.cfg.debug) console.error('[Analytics:Segment] page error:', e);
    }
  }

  reset() {
    if (!this.ready) return;
    try { (window as any).analytics?.reset(); } catch (_) { /* noop */ }
  }
}

// ---------------------------------------------------------------------------
// Provider: Mixpanel
// ---------------------------------------------------------------------------

class MixpanelProvider {
  private cfg: AnalyticsConfig;
  private ready = false;

  constructor(cfg: AnalyticsConfig) {
    this.cfg = cfg;
  }

  async init() {
    if (this.ready || typeof window === 'undefined') return;
    await this.loadScript();
    this.ready = true;
    if (this.cfg.debug) console.debug('[Analytics:Mixpanel] initialized');
  }

  private loadScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any).mixpanel) { resolve(); return; }
      const script = document.createElement('script');
      script.src = 'https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js';
      script.async = true;
      script.onload = () => {
        const mixpanel = (window as any).mixpanel;
        mixpanel?.init(this.cfg.apiKey, {
          debug: this.cfg.debug,
          loaded: () => resolve(),
        });
      };
      script.onerror = () => reject(new Error('Failed to load Mixpanel'));
      document.head.appendChild(script);
    });
  }

  track(event: string, properties?: EventProperties) {
    if (!this.ready) return;
    try {
      (window as any).mixpanel?.track(event, { ...properties, ...getContext() });
    } catch (e) {
      if (this.cfg.debug) console.error('[Analytics:Mixpanel] track error:', e);
    }
  }

  identify(userId: string, traits?: AnalyticsUserTraits) {
    if (!this.ready) return;
    try {
      (window as any).mixpanel?.identify(userId);
      if (traits) (window as any).mixpanel?.people?.set(traits);
    } catch (e) {
      if (this.cfg.debug) console.error('[Analytics:Mixpanel] identify error:', e);
    }
  }

  page(name?: string, properties?: EventProperties) {
    this.track('$pageview', { page: name, ...properties, ...getContext() });
  }

  reset() {
    if (!this.ready) return;
    try { (window as any).mixpanel?.reset(); } catch (_) { /* noop */ }
  }
}

// ---------------------------------------------------------------------------
// Provider: Plausible
// ---------------------------------------------------------------------------

class PlausibleProvider {
  private cfg: AnalyticsConfig;
  private ready = false;

  constructor(cfg: AnalyticsConfig) {
    this.cfg = cfg;
  }

  async init() {
    if (this.ready || typeof window === 'undefined') return;
    const domain = this.cfg.apiKey || window.location.hostname;
    const script = document.createElement('script');
    script.src = 'https://plausible.io/js/script.js';
    script.async = true;
    script.defer = true;
    script.setAttribute('data-domain', domain);
    document.head.appendChild(script);
    this.ready = true;
    if (this.cfg.debug) console.debug('[Analytics:Plausible] initialized');
  }

  track(event: string, properties?: EventProperties) {
    if (!this.ready) return;
    try {
      const plausible = (window as any).plausible;
      plausible?.(event, { props: properties });
    } catch (e) {
      if (this.cfg.debug) console.error('[Analytics:Plausible] track error:', e);
    }
  }

  identify(_userId: string, _traits?: AnalyticsUserTraits) {
    // Plausible is privacy-first; user identification is intentionally a no-op
  }

  page(name?: string, properties?: EventProperties) {
    this.track('pageview', { page: name, ...properties });
  }

  reset() { /* noop */ }
}

// ---------------------------------------------------------------------------
// Provider: Self-hosted (generic HTTP POST endpoint)
// ---------------------------------------------------------------------------

class SelfHostedProvider {
  private cfg: AnalyticsConfig;
  private queue: any[] = [];
  private flushTimer: any;
  private ready = false;

  constructor(cfg: AnalyticsConfig) {
    this.cfg = cfg;
  }

  async init() {
    if (!this.cfg.endpoint) {
      console.warn('[Analytics:SelfHosted] No endpoint configured');
      return;
    }
    this.ready = true;
    this.startFlushTimer();
    if (this.cfg.debug) console.debug('[Analytics:SelfHosted] initialized');
  }

  private startFlushTimer() {
    this.flushTimer = setInterval(() => this.flush(), 10000);
  }

  track(event: string, properties?: EventProperties) {
    this.queue.push({
      type: 'track',
      event,
      properties: { ...properties, ...getContext() },
      timestamp: new Date().toISOString(),
    });
    if (this.queue.length >= 10) this.flush();
  }

  identify(userId: string, traits?: AnalyticsUserTraits) {
    this.queue.push({
      type: 'identify',
      userId,
      traits: { ...traits, ...getContext() },
      timestamp: new Date().toISOString(),
    });
  }

  page(name?: string, properties?: EventProperties) {
    this.queue.push({
      type: 'page',
      name,
      properties: { ...properties, ...getContext() },
      timestamp: new Date().toISOString(),
    });
  }

  private async flush() {
    if (!this.ready || this.queue.length === 0) return;
    const batch = this.queue.splice(0, this.queue.length);
    try {
      const resp = await fetch(`${this.cfg.endpoint}/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch, sentAt: new Date().toISOString() }),
        keepalive: true,
      });
      if (!resp.ok && this.cfg.debug) {
        console.error('[Analytics:SelfHosted] flush failed:', resp.status);
      }
    } catch (e) {
      if (this.cfg.debug) console.error('[Analytics:SelfHosted] flush error:', e);
      // Re-queue failed events
      this.queue.unshift(...batch);
    }
  }

  reset() {
    this.queue = [];
  }

  destroy() {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flush();
  }
}

// ---------------------------------------------------------------------------
// No-op provider (fallback when tracking disabled or no provider configured)
// ---------------------------------------------------------------------------

class NoopProvider {
  async init() { /* noop */ }
  track(_event: string, _properties?: EventProperties) { /* noop */ }
  identify(_userId: string, _traits?: AnalyticsUserTraits) { /* noop */ }
  page(_name?: string, _properties?: EventProperties) { /* noop */ }
  reset() { /* noop */ }
}

// ---------------------------------------------------------------------------
// Analytics singleton
// ---------------------------------------------------------------------------

class AnalyticsService {
  private provider: any;
  private cfg: AnalyticsConfig;
  private initialized = false;

  constructor() {
    this.cfg = getConfig();
    this.provider = this.createProvider();
  }

  private createProvider() {
    if (!shouldTrack()) return new NoopProvider();
    switch (this.cfg.provider) {
      case 'segment': return new SegmentProvider(this.cfg);
      case 'mixpanel': return new MixpanelProvider(this.cfg);
      case 'plausible': return new PlausibleProvider(this.cfg);
      case 'self-hosted': return new SelfHostedProvider(this.cfg);
      default: return new NoopProvider();
    }
  }

  /** Initialize the active provider (call once at app startup) */
  async init(): Promise<void> {
    if (this.initialized) return;
    await this.provider.init();
    this.initialized = true;

    if (this.cfg.debug) {
      console.debug('[Analytics] initialized', {
        provider: this.cfg.provider,
        shouldTrack: shouldTrack(),
        dnt: isDntEnabled(),
        optedOut: isGdprOptedOut(),
      });
    }
  }

  /** Track a named event with optional properties */
  track(event: AnalyticsEvent | string, properties?: EventProperties): void {
    if (!shouldTrack()) return;
    this.provider.track(event, this.enrich(properties));
    if (this.cfg.debug) console.debug('[Analytics] track:', event, properties);
  }

  /** Identify the current user */
  identify(userId: string, traits?: AnalyticsUserTraits): void {
    if (!shouldTrack()) return;
    // Persist user ID for session continuity
    try { sessionStorage.setItem('__analytics_uid', userId); } catch (_) { /* noop */ }
    this.provider.identify(userId, this.enrich(traits));
    if (this.cfg.debug) console.debug('[Analytics] identify:', userId, traits);
  }

  /** Track a page view */
  page(name?: string, properties?: EventProperties): void {
    if (!shouldTrack()) return;
    this.provider.page(name ?? window.location?.pathname, this.enrich(properties));
    if (this.cfg.debug) console.debug('[Analytics] page:', name, properties);
  }

  /** Track an error */
  error(error: Error, context?: Record<string, unknown>): void {
    this.track('error', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      ...context,
    });
  }

  /** Reset / logout the current user */
  reset(): void {
    try {
      sessionStorage.removeItem('__analytics_uid');
      localStorage.removeItem('__analytics_traits');
    } catch (_) { /* noop */ }
    this.provider.reset();
    if (this.cfg.debug) console.debug('[Analytics] reset');
  }

  /** User-opt-out helper (GDPR compliance) */
  optOut(): void {
    localStorage.setItem('analytics_opt_out', 'true');
    this.reset();
    if (this.cfg.debug) console.debug('[Analytics] user opted out');
  }

  /** User opt-in helper */
  optIn(): void {
    localStorage.removeItem('analytics_opt_out');
    if (this.cfg.debug) console.debug('[Analytics] user opted in');
  }

  /** Check if tracking is active */
  isActive(): boolean {
    return shouldTrack();
  }

  /** Get current provider name */
  getProvider(): string {
    return this.cfg.provider;
  }

  /** Enrich properties with app context */
  private enrich(properties?: EventProperties): EventProperties {
    return {
      ...properties,
      appVersion: this.cfg.appVersion,
      environment: this.cfg.environment,
    };
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const analytics = new AnalyticsService();

export type { AnalyticsConfig, AnalyticsEvent, AnalyticsUserTraits, EventProperties };
