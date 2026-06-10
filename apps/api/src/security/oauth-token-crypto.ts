/**
 * OAuth token at-rest encryption for platform credentials (Meta, Google, etc.).
 * Wraps encryption.ts with legacy plaintext passthrough on read.
 */

import { decryptToken, encryptToken, isEncrypted } from './encryption';

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
