# Operations Runbook

Operational procedures for running AdNexus AI in production. See also
`docs/KNOWN_LIMITATIONS.md` and `docs/AUDIT_360_2026-06.md`.

## OAuth token re-encryption backfill

**When:** the API logs `Encountered a legacy plaintext OAuth token at rest`
(emitted once per process by `security/oauth-token-crypto.ts`). This means some
`ad_accounts` rows still hold tokens written before at-rest encryption was added.

**Context:** all *writes* encrypt tokens (`encryptOAuthTokenForStorage`), and the
read path (`decryptOAuthTokenFromStorage`) transparently returns legacy plaintext.
Plaintext rows self-heal on the next token refresh, but a one-time backfill
remediates them immediately.

**Procedure (requires DB access + `ENCRYPTION_MASTER_KEY` set to the production
value):**

1. Snapshot the table first: `pg_dump --table=ad_accounts > ad_accounts.bak.sql`.
2. From `apps/api`, run a one-off that re-wraps any non-`enc:v1:` token using the
   same helpers the app uses, e.g. a `tsx` script:

   ```ts
   import { query } from './src/db/connection';
   import { encryptOAuthTokenForStorage } from './src/security/oauth-token-crypto';
   import { isEncrypted } from './src/security/encryption';

   const { rows } = await query(
     `SELECT id, oauth_token, refresh_token FROM ad_accounts
       WHERE oauth_token IS NOT NULL OR refresh_token IS NOT NULL`,
   );
   for (const r of rows) {
     const oauth = r.oauth_token && !isEncrypted(r.oauth_token)
       ? encryptOAuthTokenForStorage(r.oauth_token) : r.oauth_token;
     const refresh = r.refresh_token && !isEncrypted(r.refresh_token)
       ? encryptOAuthTokenForStorage(r.refresh_token) : r.refresh_token;
     if (oauth !== r.oauth_token || refresh !== r.refresh_token) {
       await query(`UPDATE ad_accounts SET oauth_token=$2, refresh_token=$3 WHERE id=$1`,
         [r.id, oauth, refresh]);
     }
   }
   ```

3. Confirm no plaintext remains:
   `SELECT count(*) FROM ad_accounts WHERE oauth_token IS NOT NULL AND oauth_token NOT LIKE 'enc:v1:%';`
   The count should be 0, and the warning should not reappear after a restart.

**Rollback:** restore from the snapshot. Encryption is reversible with the same
`ENCRYPTION_MASTER_KEY`, so re-running the backfill is idempotent (it skips
already-wrapped values via `isEncrypted`).
