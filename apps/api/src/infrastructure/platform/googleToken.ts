import { query } from '../database/connection';
import { refreshGoogleToken } from '../../services/google-api';
import { persistRefreshedToken } from '../../platforms/account-store';
import { getModuleLogger } from '../../lib/logger';
import { decryptToken } from '../../security/encryption';

const log = getModuleLogger('google-token');

export async function resolveGoogleToken(adAccountId: string): Promise<string | null> {
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

  if (!expiresSoon) return decryptToken(row.oauth_token);

  if (!row.refresh_token) {
    if (!alreadyExpired) {
      log.warn({ adAccountId }, 'Google token expiring soon and no refresh token; using remaining lifetime');
      return decryptToken(row.oauth_token);
    }
    log.warn({ adAccountId }, 'Google token expired and no refresh token');
    return null;
  }

  try {
    const refreshed = await refreshGoogleToken(decryptToken(row.refresh_token));
    await persistRefreshedToken(adAccountId, refreshed.accessToken, refreshed.expiresAt.toISOString());
    log.info({ adAccountId }, 'Refreshed Google token');
    return refreshed.accessToken;
  } catch (e) {
    if (!alreadyExpired) {
      log.warn({ err: e, adAccountId }, 'Google token refresh failed; using remaining lifetime');
      return decryptToken(row.oauth_token);
    }
    log.warn({ err: e, adAccountId }, 'Google token refresh failed and token expired');
    return null;
  }
}
