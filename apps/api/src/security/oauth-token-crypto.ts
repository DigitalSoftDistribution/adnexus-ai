/**
 * OAuth token at-rest encryption for platform credentials (Meta, Google, etc.).
 * Wraps encryption.ts with legacy plaintext passthrough on read.
 */

import { decryptToken, encryptToken, isEncrypted } from './encryption';
import { getModuleLogger } from '../lib/logger';

const log = getModuleLogger('oauth-token-crypto');
let warnedLegacyPlaintext = false;

/** Encrypt a token before persisting to ad_accounts. Skips values already wrapped. */
export function encryptOAuthTokenForStorage(token: string | null | undefined): string | null {
  if (token == null || token === '') return null;
  if (isEncrypted(token)) return token;
  return encryptToken(token);
}

/** Decrypt a stored token, or return legacy plaintext unchanged. */
export function decryptOAuthTokenFromStorage(token: string | null | undefined): string | null {
  if (token == null || token === '') return null;
  if (isEncrypted(token)) return decryptToken(token);
  // Legacy plaintext written before at-rest encryption. Writes always encrypt,
  // so these self-heal on the next token refresh; warn once in production so the
  // pending re-encryption backfill (docs/RUNBOOK) is visible to operators.
  if (!warnedLegacyPlaintext && process.env.NODE_ENV === 'production') {
    warnedLegacyPlaintext = true;
    log.warn(
      'Encountered a legacy plaintext OAuth token at rest; run the token re-encryption backfill to remediate',
    );
  }
  return token;
}

/** Shape for ad_accounts upsert/update columns. */
export function oauthTokensForDbWrite(
  accessToken: string,
  refreshToken?: string | null,
): { oauth_token: string; refresh_token: string | null } {
  return {
    oauth_token: encryptOAuthTokenForStorage(accessToken)!,
    refresh_token: encryptOAuthTokenForStorage(refreshToken ?? null),
  };
}
