import { query } from '../database/connection';
import { refreshMetaToken } from '../../services/meta-api';
import { persistRefreshedToken } from '../../platforms/account-store';
import { getModuleLogger } from '../../lib/logger';

const log = getModuleLogger('meta-token');

/**
 * Resolve a usable Meta access token for an ad account, refreshing it when it is
 * within a 5-minute buffer of expiry. Returns null when there is no token or the
 * refresh fails, so callers can skip platform calls gracefully.
 *
 * Shared by the sync and write services so token handling lives in one place.
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
  if (!row?.oauth_token) return null;

  const now = Date.now();
  const expiryMs = row.token_expires_at ? new Date(row.token_expires_at).getTime() : null;
  const expiresSoon = expiryMs !== null && expiryMs < now + 5 * 60 * 1000;
  const alreadyExpired = expiryMs !== null && expiryMs <= now;

  if (!expiresSoon) return row.oauth_token;

  // Expiring soon: prefer a proactive refresh. If refresh isn't possible, fall
  // back to the current token as long as it has not actually expired yet, so we
  // use its remaining lifetime instead of failing as "not connected".
  if (!row.refresh_token) {
    if (!alreadyExpired) {
      log.warn({ adAccountId }, 'Meta token expiring soon and no refresh token; using remaining lifetime');
      return row.oauth_token;
    }
    log.warn({ adAccountId }, 'Meta token expired and no refresh token');
    return null;
  }

  try {
    const refreshed = await refreshMetaToken(row.refresh_token);
    const newExpiry = new Date(now + (refreshed.expires_in ?? 3600) * 1000).toISOString();
    await persistRefreshedToken(adAccountId, refreshed.access_token, newExpiry);
    log.info({ adAccountId }, 'Refreshed Meta token');
    return refreshed.access_token;
  } catch (e) {
    if (!alreadyExpired) {
      log.warn({ err: e, adAccountId }, 'Meta token refresh failed; using remaining lifetime');
      return row.oauth_token;
    }
    log.warn({ err: e, adAccountId }, 'Meta token refresh failed and token expired');
    return null;
  }
}
