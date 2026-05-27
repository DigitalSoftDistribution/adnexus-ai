/**
 * Token Manager
 * =============
 * Handles OAuth 2.0 flows (authorization code + refresh) for TikTok.
 * Automatically refreshes access tokens before expiry.
 */

import {
  TikTokClientConfig,
  TikTokTokens,
  TikTokTokenResponse,
  TikTokRefreshTokenResponse,
  TikTokOAuthConfig,
} from "./types";

/** Buffer before expiry to trigger proactive refresh (5 minutes). */
const EXPIRY_BUFFER_MS = 5 * 60 * 1000;

export class TikTokTokenManager {
  private tokens: TikTokTokens | null = null;
  private refreshPromise: Promise<string> | null = null;

  constructor(
    private readonly oauth: TikTokOAuthConfig,
    private readonly authBaseUrl: string,
    private readonly onTokenRefresh?: (tokens: TikTokTokens) => void | Promise<void>
  ) {}

  // ── OAuth URL Builder ──────────────────────────────────────

  /**
   * Build the TikTok OAuth authorization URL.
   */
  buildAuthUrl(state?: string, extraParams?: Record<string, string>): string {
    const scope = this.oauth.scope ?? ["ads_read", "ads_management"];
    const url = new URL("https://ads.tiktok.com/marketing_api/auth");
    url.searchParams.set("app_id", this.oauth.clientId);
    url.searchParams.set("redirect_uri", this.oauth.redirectUri);
    url.searchParams.set("scope", scope.join(","));
    url.searchParams.set("state", state || this.generateState());
    if (extraParams) {
      for (const [k, v] of Object.entries(extraParams)) {
        url.searchParams.set(k, v);
      }
    }
    return url.toString();
  }

  /**
   * Exchange an authorization code for access + refresh tokens.
   */
  async exchangeCode(code: string): Promise<TikTokTokens> {
    const url = `${this.authBaseUrl}/oauth2/access_token/`;
    const body = {
      app_id: this.oauth.clientId,
      secret: this.oauth.clientSecret,
      auth_code: code,
      grant_type: "auth_code",
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Token exchange failed: HTTP ${res.status} — ${text}`);
    }

    const json = (await res.json()) as { data?: TikTokTokenResponse; message?: string; code?: number };
    if (json.code !== 0 || !json.data) {
      throw new Error(`Token exchange failed: ${json.message || "Unknown error"} (code: ${json.code})`);
    }

    const data = json.data;
    const now = Date.now();
    this.tokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: now + data.expires_in * 1000,
      refreshExpiresAt: now + data.refresh_expires_in * 1000,
      scope: data.scope || [],
    };

    await this.emitRefresh();
    return this.tokens;
  }

  // ── Token Access & Refresh ─────────────────────────────────

  /**
   * Get a valid access token, refreshing proactively if near expiry.
   */
  async getAccessToken(): Promise<string> {
    if (!this.tokens) {
      throw new Error("No tokens available. Authenticate via exchangeCode() first.");
    }

    // Token still valid with buffer?
    if (Date.now() < this.tokens.expiresAt - EXPIRY_BUFFER_MS) {
      return this.tokens.accessToken;
    }

    // Need refresh — dedupe concurrent calls
    if (!this.refreshPromise) {
      this.refreshPromise = this.performRefresh().finally(() => {
        this.refreshPromise = null;
      });
    }
    return this.refreshPromise;
  }

  /**
   * Return current tokens (if any) without network calls.
   */
  getTokens(): TikTokTokens | null {
    return this.tokens;
  }

  /**
   * Set tokens directly (e.g., loaded from database).
   */
  setTokens(tokens: TikTokTokens): void {
    this.tokens = tokens;
  }

  /**
   * Check if the refresh token itself has expired.
   */
  isRefreshTokenExpired(): boolean {
    return !this.tokens || Date.now() >= this.tokens.refreshExpiresAt;
  }

  // ── Internal ───────────────────────────────────────────────

  private async performRefresh(): Promise<string> {
    if (!this.tokens) throw new Error("No tokens to refresh");

    if (Date.now() >= this.tokens.refreshExpiresAt) {
      throw new Error("Refresh token has expired. Re-authentication required.");
    }

    const url = `${this.authBaseUrl}/oauth2/refresh_token/`;
    const body = {
      app_id: this.oauth.clientId,
      secret: this.oauth.clientSecret,
      refresh_token: this.tokens.refreshToken,
      grant_type: "refresh_token",
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Token refresh failed: HTTP ${res.status} — ${text}`);
    }

    const json = (await res.json()) as {
      data?: TikTokRefreshTokenResponse;
      message?: string;
      code?: number;
    };

    if (json.code !== 0 || !json.data) {
      throw new Error(`Token refresh failed: ${json.message || "Unknown error"} (code: ${json.code})`);
    }

    const data = json.data;
    const now = Date.now();

    // Update tokens — TikTok may rotate refresh_token
    this.tokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || this.tokens.refreshToken,
      expiresAt: now + data.expires_in * 1000,
      refreshExpiresAt: data.refresh_expires_in
        ? now + data.refresh_expires_in * 1000
        : this.tokens.refreshExpiresAt,
      scope: data.scope || this.tokens.scope,
    };

    await this.emitRefresh();
    return this.tokens.accessToken;
  }

  private async emitRefresh(): Promise<void> {
    if (this.onTokenRefresh && this.tokens) {
      try {
        await this.onTokenRefresh(this.tokens);
      } catch {
        // Callback errors must not break token flow
      }
    }
  }

  private generateState(): string {
    return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }
}
