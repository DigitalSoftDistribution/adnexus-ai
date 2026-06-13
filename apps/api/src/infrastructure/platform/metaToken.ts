import { query } from '../database/connection';
import { refreshMetaToken } from '../../services/meta-api';
import { persistRefreshedToken } from '../../platforms/account-store';
import { decryptToken } from '../../security/encryption';
import { getModuleLogger } from '../../lib/logger';
import { decryptOAuthTokenFromStorage } from '../../security/oauth-token-crypto';
import { resolveMockHarnessToken } from './mockHarnessTokens';

const log = getModuleLogger('meta-token');

const nodeEnv = () => process.env.NODE_ENV ?? 'development';
const isDevOrTestEnv = () => nodeEnv() === 'development' || nodeEnv() === 'test';

/**
 * OAuth token resolution for Meta API calls.
 *
 * Production: tokens come from `ad_accounts.oauth_token` (written by Meta OAuth
 * callbacks). Connect Meta via Settings → Integrations per workspace.
 *
 * Development / test only: `META_ACCESS_TOKEN` may be set as a local fallback
 * when no workspace account is connected. It is ignored in staging/production.
 */

/** Unwrap a stored oauth_token (plain text or enc:v1:… ciphertext). */
export function unwrapStoredOAuthToken(stored: string): string | null {
  if (!stored) return null;
  if (stored.startsWith('enc:v1:')) {
    try {
      return decryptToken(stored);
    } catch (e) {
      log.warn({ err: e }, 'Failed to decrypt Meta oauth token');
      return null;
    }
  }
  return stored;
}

/**
 * Dev/test-only fallback. Returns null in staging/production even when set.
 */
export function getDevMetaAccessToken(): string | null {
  const token = process.env.META_ACCESS_TOKEN?.trim();
  if (!token) return null;

  if (isDevOrTestEnv()) {
    log.debug('Using META_ACCESS_TOKEN dev fallback');
    return token;
  }

  log.warn('META_ACCESS_TOKEN is set but ignored outside development/test');
  return null;
}

/**
 * Resolve a usable Meta access token for an ad account, refreshing it when it is
 * within a 5-minute buffer of expiry. Returns null when there is no token or the
 * refresh fails, so callers can skip platform calls gracefully.
 *
 * Shared by the sync, write, and platform client layers so token handling lives
 * in one place.
 */
export async function resolveMetaToken(adAccountId: string): Promise<string | null> {
  const { rows } = await query<{
    oauth_token: string | null;
    refresh_token: string | null;
    token_expires_at: string | null;
  }>(
    `SELECT oauth_token, refresh_token, token_expires_at FROM ad_accounts WHERE id = $1 LIMIT 1`,
    [adAccountId],
  );
  const row = rows[0];
  const oauthToken = decryptOAuthTokenFromStorage(row?.oauth_token);
  if (!oauthToken) {
    return resolveMockHarnessToken(adAccountId, 'meta');
  }

  const now = Date.now();
  const expiryMs = row.token_expires_at ? new Date(row.token_expires_at).getTime() : null;
  const expiresSoon = expiryMs !== null && expiryMs < now + 5 * 60 * 1000;
  const alreadyExpired = expiryMs !== null && expiryMs <= now;

  if (!expiresSoon) return oauthToken;

  // Expiring soon: prefer a proactive refresh. If refresh isn't possible, fall
  // back to the current token as long as it has not actually expired yet, so we
  // use its remaining lifetime instead of failing as "not connected".
  const refreshToken = decryptOAuthTokenFromStorage(row.refresh_token);
  if (!refreshToken) {
    if (!alreadyExpired) {
      log.warn({ adAccountId }, 'Meta token expiring soon and no refresh token; using remaining lifetime');
      return oauthToken;
    }
    log.warn({ adAccountId }, 'Meta token expired and no refresh token');
    return null;
  }

  try {
    const refreshed = await refreshMetaToken(refreshToken);
    const newExpiry = new Date(now + (refreshed.expires_in ?? 3600) * 1000).toISOString();
    await persistRefreshedToken(adAccountId, refreshed.access_token, newExpiry);
    log.info({ adAccountId }, 'Refreshed Meta token');
    return refreshed.access_token;
  } catch (e) {
    if (!alreadyExpired) {
      log.warn({ err: e, adAccountId }, 'Meta token refresh failed; using remaining lifetime');
      return oauthToken;
    }
    log.warn({ err: e, adAccountId }, 'Meta token refresh failed and token expired');
    return null;
  }
}

/**
 * Resolve a Meta access token for API calls: workspace OAuth first, dev fallback second.
 */
export async function resolveMetaAccessToken(adAccountId: string): Promise<string | null> {
  const oauthToken = await resolveMetaToken(adAccountId);
  if (oauthToken) return oauthToken;
  return getDevMetaAccessToken();
}
