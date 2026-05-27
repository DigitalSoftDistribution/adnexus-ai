/**
 * Google Ads API - Authentication Module
 * AdNexus AI Platform
 *
 * Handles OAuth 2.0 flows, token management, refresh logic,
 * and request authentication for Google Ads API.
 */

import {
  GoogleOAuthConfig,
  GoogleTokens,
  TokenRefreshResponse,
  GoogleAdsApiConfig,
  AuthUrlOptions,
  GoogleAdsClientConfig,
} from "./types";

const DEFAULT_SCOPES = [
  "https://www.googleapis.com/auth/adwords",
];

const GOOGLE_OAUTH_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";

/**
 * Manages OAuth 2.0 authentication for Google Ads API.
 * Handles authorization URL generation, token exchange,
 * automatic token refresh, and authenticated request headers.
 */
export class GoogleAdsAuth {
  private config: GoogleOAuthConfig;
  private apiConfig: GoogleAdsApiConfig;
  private tokens: GoogleTokens | null = null;
  private refreshPromise: Promise<string> | null = null;
  private tokenRefreshCallbacks: Array<(tokens: GoogleTokens) => void | Promise<void>> = [];

  constructor(config: GoogleAdsClientConfig) {
    this.config = config.auth;
    this.apiConfig = config.api;
  }

  // ---------------------------------------------------------------------------
  // OAuth 2.0 Flow
  // ---------------------------------------------------------------------------

  /**
   * Generate the OAuth 2.0 authorization URL for Google sign-in.
   *
   * @param options - Optional parameters for the auth URL
   * @returns The complete authorization URL to redirect the user to
   *
   * @example
   * ```typescript
   * const authUrl = auth.getAuthorizationUrl({
   *   state: JSON.stringify({ customerId: "1234567890" }),
   *   accessType: "offline",
   *   prompt: "consent",
   * });
   * ```
   */
  getAuthorizationUrl(options: AuthUrlOptions = {}): string {
    const scopes = this.config.scopes ?? DEFAULT_SCOPES;

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: "code",
      scope: scopes.join(" "),
      access_type: options.accessType ?? "offline",
      prompt: options.prompt ?? "consent",
    });

    if (options.state) {
      params.set("state", options.state);
    }

    if (options.includeGrantedScopes) {
      params.set("include_granted_scopes", "true");
    }

    if (options.loginHint) {
      params.set("login_hint", options.loginHint);
    }

    return `${GOOGLE_OAUTH_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange an authorization code for access and refresh tokens.
   *
   * @param code - The authorization code from Google's callback
   * @returns The full token response including access_token, refresh_token, and expiry
   *
   * @throws Error if the token exchange fails
   */
  async exchangeCode(code: string): Promise<GoogleTokens> {
    const body = new URLSearchParams({
      code,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: this.config.redirectUri,
      grant_type: "authorization_code",
    });

    const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Token exchange failed: ${response.status} ${response.statusText} - ${errorBody}`
      );
    }

    const data = await response.json();

    this.tokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expiry_date: Date.now() + data.expires_in * 1000,
      token_type: data.token_type ?? "Bearer",
      id_token: data.id_token,
      scope: data.scope,
    };

    await this.notifyTokenRefresh(this.tokens);
    return this.tokens;
  }

  // ---------------------------------------------------------------------------
  // Token Management
  // ---------------------------------------------------------------------------

  /**
   * Set tokens directly (e.g., when loading from database).
   *
   * @param tokens - The stored tokens to use
   */
  setTokens(tokens: GoogleTokens): void {
    this.tokens = tokens;
  }

  /**
   * Get the current tokens.
   *
   * @returns Current tokens or null if not authenticated
   */
  getTokens(): GoogleTokens | null {
    return this.tokens;
  }

  /**
   * Check if the current access token is expired or about to expire.
   *
   * @param bufferSeconds - Seconds before actual expiry to consider token expired (default: 60)
   * @returns true if the token needs refreshing
   */
  isTokenExpired(bufferSeconds: number = 60): boolean {
    if (!this.tokens) return true;
    return Date.now() >= this.tokens.expiry_date - bufferSeconds * 1000;
  }

  /**
   * Refresh the access token using the stored refresh token.
   * Deduplicates concurrent refresh calls.
   *
   * @returns The new access token
   *
   * @throws Error if no refresh token is available or refresh fails
   */
  async refreshAccessToken(): Promise<string> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh();

    try {
      const accessToken = await this.refreshPromise;
      return accessToken;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performTokenRefresh(): Promise<string> {
    if (!this.tokens?.refresh_token) {
      throw new Error("No refresh token available. Re-authentication required.");
    }

    const body = new URLSearchParams({
      refresh_token: this.tokens.refresh_token,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      grant_type: "refresh_token",
    });

    const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorBody = await response.text();

      if (response.status === 400 || response.status === 401) {
        throw new Error(
          `Refresh token invalid or revoked: ${errorBody}. Re-authentication required.`
        );
      }

      throw new Error(
        `Token refresh failed: ${response.status} ${response.statusText} - ${errorBody}`
      );
    }

    const data: TokenRefreshResponse = await response.json();

    this.tokens = {
      ...this.tokens,
      access_token: data.access_token,
      expiry_date: Date.now() + data.expires_in * 1000,
      token_type: data.token_type ?? "Bearer",
      scope: data.scope ?? this.tokens.scope,
    };

    await this.notifyTokenRefresh(this.tokens);
    return this.tokens.access_token;
  }

  /**
   * Ensure a valid access token is available, refreshing if necessary.
   *
   * @returns A valid access token
   */
  async ensureValidToken(): Promise<string> {
    if (!this.tokens) {
      throw new Error("No tokens available. Authenticate first.");
    }

    if (this.isTokenExpired()) {
      return this.refreshAccessToken();
    }

    return this.tokens.access_token;
  }

  // ---------------------------------------------------------------------------
  // Request Headers
  // ---------------------------------------------------------------------------

  /**
   * Build authenticated request headers for Google Ads API.
   * Automatically refreshes the token if needed.
   *
   * @returns Headers object with Authorization and developer-token
   */
  async getRequestHeaders(): Promise<Record<string, string>> {
    const accessToken = await this.ensureValidToken();

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": this.apiConfig.developerToken,
      "Content-Type": "application/json",
    };

    if (this.apiConfig.loginCustomerId) {
      headers["login-customer-id"] = this.apiConfig.loginCustomerId;
    }

    if (this.apiConfig.linkedCustomerId) {
      headers["linked-customer-id"] = this.apiConfig.linkedCustomerId;
    }

    return headers;
  }

  /**
   * Build headers without triggering token refresh.
   * Useful for synchronous operations.
   *
   * @returns Headers with current token (may be expired)
   */
  getRequestHeadersSync(): Record<string, string> | null {
    if (!this.tokens) return null;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.tokens.access_token}`,
      "developer-token": this.apiConfig.developerToken,
      "Content-Type": "application/json",
    };

    if (this.apiConfig.loginCustomerId) {
      headers["login-customer-id"] = this.apiConfig.loginCustomerId;
    }

    return headers;
  }

  // ---------------------------------------------------------------------------
  // Callbacks / Events
  // ---------------------------------------------------------------------------

  /**
   * Register a callback to be invoked whenever tokens are refreshed.
   *
   * @param callback - Function called with new tokens (useful for persisting to DB)
   */
  onTokenRefresh(
    callback: (tokens: GoogleTokens) => void | Promise<void>
  ): void {
    this.tokenRefreshCallbacks.push(callback);
  }

  /**
   * Remove a previously registered token refresh callback.
   *
   * @param callback - The callback to remove
   */
  offTokenRefresh(
    callback: (tokens: GoogleTokens) => void | Promise<void>
  ): void {
    this.tokenRefreshCallbacks = this.tokenRefreshCallbacks.filter(
      (cb) => cb !== callback
    );
  }

  private async notifyTokenRefresh(tokens: GoogleTokens): Promise<void> {
    for (const callback of this.tokenRefreshCallbacks) {
      try {
        await callback(tokens);
      } catch (err) {
        console.error("Token refresh callback error:", err);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Revocation
  // ---------------------------------------------------------------------------

  /**
   * Revoke the current access token and clear local state.
   * The refresh token remains valid unless explicitly revoked by the user.
   */
  async revokeToken(): Promise<void> {
    if (!this.tokens?.access_token) return;

    try {
      await fetch("https://oauth2.googleapis.com/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: this.tokens.access_token }),
      });
    } catch (err) {
      console.warn("Token revocation request failed:", err);
    }

    this.tokens = null;
  }

  /**
   * Clear all stored tokens without revoking them server-side.
   */
  clearTokens(): void {
    this.tokens = null;
    this.refreshPromise = null;
  }
}
