# Meta OAuth setup — AdNexus production preview (SB-3234 B4)

Step-by-step runbook for **hi@fbeeg.io** to enable live Meta Ads OAuth on `adnexus-api.apps.softblaze.net` / `adnexus-ai.apps.softblaze.net`.

> **Do not paste real secrets into git, Linear, or PR comments.** Set values only in Coolify and Meta Developer Console.

---

## Architecture (read this first)

| Surface | URL | Role |
|---|---|---|
| **Web (Next.js)** | `https://adnexus-ai.apps.softblaze.net` | UI + same-origin `/api/v1/*` rewrites to API |
| **API (Express)** | `https://adnexus-api.apps.softblaze.net` | OAuth handlers, token storage, Meta Graph calls |

OAuth callback URLs are built from **`FRONTEND_URL` on the API app**, not from `adnexus-api` directly:

```text
{FRONTEND_URL}/api/v1/auth/meta/callback
```

With production values that resolves to:

```text
https://adnexus-ai.apps.softblaze.net/api/v1/auth/meta/callback
```

Next.js rewrites `/api/v1/:path*` → `API_URL` (`adnexus-api`), so Meta must redirect to the **web** host above.

Connect entry point (owner/admin JWT required):

```text
GET https://adnexus-api.apps.softblaze.net/api/v1/auth/meta/connect?workspace_id={uuid}
```

Or same-origin from the dashboard:

```text
GET https://adnexus-ai.apps.softblaze.net/api/v1/auth/meta/connect?workspace_id={uuid}
```

---

## 1. Meta Developer Console

1. Open [Meta for Developers](https://developers.facebook.com/) → **My Apps** → create or select the AdNexus app.
2. Add product **Facebook Login** (or **Marketing API** with OAuth).
3. **Settings → Basic**
   - **App Domains:** `adnexus-ai.apps.softblaze.net`, `softblaze.net`
   - **Privacy Policy URL** and **Terms** (required for App Review / live mode)
4. **Facebook Login → Settings → Valid OAuth Redirect URIs** — add **exactly**:

   ```text
   https://adnexus-ai.apps.softblaze.net/api/v1/auth/meta/callback
   ```

   For per-PR previews (optional, when testing branches):

   ```text
   https://pr-<N>-adnexus-ai.apps.softblaze.net/api/v1/auth/meta/callback
   ```

5. **Permissions / scopes** — the API requests:

   | Scope | Purpose |
   |---|---|
   | `ads_read` | Read campaigns, ads, insights |
   | `ads_management` | Create/update campaigns (draft apply) |
   | `business_management` | List ad accounts under Business Manager |

6. Copy **App ID** and **App Secret** (Settings → Basic). Store in a password manager — set in Coolify only (step 2).

7. **App mode:** Development mode works for app admins/testers only. For customer-facing sellability, complete **App Review** and switch to **Live**.

8. **Business Manager:** Ensure the Meta user who connects has access to at least one ad account under a Business you manage.

---

## 2. Coolify env vars (`adnexus-api`)

App: **adnexus-api** (`x10mxscm633zyl2wlxam9eix`) — branch `main`, FQDN `https://adnexus-api.apps.softblaze.net`.

Set on **production** (and **preview** if you want OAuth on PR builds):

| Variable | Required | Example / notes |
|---|---|---|
| `META_APP_ID` | **Yes** | Numeric App ID from Meta console |
| `META_APP_SECRET` | **Yes** | App Secret — never commit |
| `META_API_VERSION` | No | Default `v19.0` (matches route constants) |
| `META_GRAPH_URL` | No | Default `https://graph.facebook.com` — use WireMock URL only in local/CI |
| `FRONTEND_URL` | **Yes** | `https://adnexus-ai.apps.softblaze.net` — drives `redirect_uri` |
| `API_BASE_URL` | Recommended | `https://adnexus-api.apps.softblaze.net` |
| `ENCRYPTION_MASTER_KEY` | **Yes** | 64-char hex (32 bytes) — **already set**; encrypts tokens at rest (PR #116) |
| `JWT_SECRET` | **Yes** | Already set |
| `CORS_ORIGINS` | **Yes** | Must include `https://adnexus-ai.apps.softblaze.net` |

**Currently missing on production (blocks live OAuth):** `META_APP_ID`, `META_APP_SECRET`.

**Do not set on production:** `META_ACCESS_TOKEN` — dev/test fallback only (PR #118); ignored in production.

Commands (Beast):

```bash
coolify env-set adnexus-api META_APP_ID '<app-id>'
coolify env-set adnexus-api META_APP_SECRET '<app-secret>'
coolify env-set adnexus-api FRONTEND_URL 'https://adnexus-ai.apps.softblaze.net'
# Only if changed — one deploy, then wait for coolify/adnexus-api success:
coolify deploy adnexus-api --force
```

### Web app (`adnexus-ai`) — no Meta secrets here

Ensure:

| Variable | Value |
|---|---|
| `API_URL` | `https://adnexus-api.apps.softblaze.net` |
| `NEXT_PUBLIC_API_URL` | Same as `API_URL` |

---

## 3. Code paths verified on `main` (PRs #116, #118, #120)

| PR | Issue | What landed | Key files |
|---|---|---|---|
| **#116** | SB-3185 | AES-256-GCM encryption for OAuth tokens at rest (`enc:v1:` prefix) | `apps/api/src/security/oauth-token-crypto.ts`, `routes/auth/meta.ts` (write), `metaToken.ts` (read) |
| **#118** | SB-3226 | `MetaPlatformClient` uses per-workspace tokens via `resolveMetaAccessToken`; no global prod token | `apps/api/src/infrastructure/platform/metaToken.ts`, `MetaPlatformClient.ts` |
| **#120** | SB-3227 | Removed `placeholder_token` / fake account stub in `PlatformManager.connectAccount` | `apps/api/src/platforms/index.ts`, `ConnectAdAccountUseCase.ts` |

### Connect URL flow (`GET /api/v1/auth/meta/connect`)

1. `requireAuth` + `requireAdmin` (owner/admin only).
2. Validates `workspace_id` matches JWT workspace.
3. Builds `redirect_uri` via `oauthCallbackUrl('meta')` → `{FRONTEND_URL}/api/v1/auth/meta/callback`.
4. Signs OAuth `state` JWT (10 min TTL, Redis/memory nonce).
5. Redirects (or JSON `{ redirectUrl }` when `Accept: application/json`) to:

   ```text
   https://www.facebook.com/v19.0/dialog/oauth
     ?client_id={META_APP_ID}
     &redirect_uri={FRONTEND_URL}/api/v1/auth/meta/callback
     &scope=ads_read,ads_management,business_management
     &state={signed-jwt}
     &response_type=code
   ```

### Callback + token storage (`GET /api/v1/auth/meta/callback`)

1. Verifies `state`, consumes one-time nonce.
2. Exchanges `code` → short-lived token → long-lived token (60 days).
3. Fetches `/me/adaccounts` from Graph API.
4. Persists rows in `ad_accounts` with **`oauthTokensForDbWrite()`** (encrypted `oauth_token` / `refresh_token`).
5. Redirects to `{FRONTEND_URL}/dashboard/integrations?platform=meta&status=connected`.

### Token use on API calls

- `resolveMetaToken(adAccountId)` decrypts stored token, refreshes if expiring within 5 minutes.
- `createMetaPlatformClientForWorkspace(workspaceId, adAccountId)` scopes all Meta Graph calls to that account.

---

## 4. Verification checklist (hi@fbeeg.io)

### A. Pre-flight (no Meta secrets yet)

Sign in as QA owner (password in 1Password / team vault):

```bash
API=https://adnexus-api.apps.softblaze.net
curl -sS -X POST "$API/api/v1/auth/signin" \
  -H 'Content-Type: application/json' \
  -d '{"email":"qa-owner@softblaze.net","password":"<QA_PASSWORD>"}' \
  | jq '.data | {token: .token[0:20], workspace: .workspace.id}'
```

Without `META_APP_ID` / `META_APP_SECRET`, connect returns config error (expected):

```bash
TOKEN='<access-token-from-signin>'
WS='<workspace-uuid>'
curl -sS "$API/api/v1/auth/meta/connect?workspace_id=$WS" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-workspace-id: $WS" \
  -H "Accept: application/json" | jq .
```

**Observed 2026-06-11:**

```json
{
  "success": false,
  "error": "Meta OAuth is not configured",
  "code": "MISSING_META_OAUTH_CONFIG"
}
```

Auth + RBAC path is healthy; only Meta app credentials are missing.

### B. After Coolify secrets are set

Repeat connect with `Accept: application/json`. Expect:

```json
{
  "success": true,
  "data": {
    "redirectUrl": "https://www.facebook.com/v19.0/dialog/oauth?client_id=...&redirect_uri=https%3A%2F%2Fadnexus-ai.apps.softblaze.net%2Fapi%2Fv1%2Fauth%2Fmeta%2Fcallback&scope=ads_read%2Cads_management%2Cbusiness_management&state=...&response_type=code"
  }
}
```

Decode `redirect_uri` — must match Meta console **exactly**.

### C. End-to-end OAuth (browser)

1. Log in at `https://adnexus-ai.apps.softblaze.net` as workspace **owner** or **admin**.
2. **Dashboard → Integrations → Connect Meta** (or open connect URL with `workspace_id`).
3. Complete Meta consent → land on `/dashboard/integrations?platform=meta&status=connected`.
4. Confirm `ad_accounts` row: `platform=meta`, `status=active`, `oauth_token` starts with `enc:v1:`.
5. Trigger sync or open campaigns — API should use workspace token (not mock seed account).

### D. Unit test reference (local / CI)

```bash
pnpm --filter @adnexus/api exec jest tests/integration/oauth-hardening.test.ts -t "returns API callback redirect"
```

Asserts `redirect_uri` = `{FRONTEND_URL}/api/v1/auth/meta/callback`.

---

## 5. Blockers summary

| Item | Status | Owner action |
|---|---|---|
| `META_APP_ID` / `META_APP_SECRET` on `adnexus-api` | **Missing** | Set in Coolify |
| Meta Valid OAuth Redirect URI | **Not configured** | Add web callback URL in Meta console |
| `ENCRYPTION_MASTER_KEY` | **Set** | No action |
| Meta App Review / Live mode | **Unknown** | Required for non-tester users |
| Test Business + ad account access | **Unknown** | Connect with a user that owns BM ad accounts |

Everything else (connect route, state hardening, encrypted storage, workspace-scoped client, placeholder removal) is **merged on `main`**.

---

## 6. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `MISSING_META_OAUTH_CONFIG` | Empty `META_APP_ID` or `META_APP_SECRET` | Coolify env-set + redeploy |
| Meta "URL blocked" | Redirect URI mismatch | Must be `https://adnexus-ai.apps.softblaze.net/api/v1/auth/meta/callback` |
| `invalid_oauth_state` | Expired state (>10 min) or replay | Start connect again |
| `403 Workspace mismatch` | `workspace_id` ≠ JWT workspace | Pass correct `workspace_id` query param |
| Connect works, sync 401 | Token not decrypted / wrong `ENCRYPTION_MASTER_KEY` | Re-OAuth after fixing key |
| `placeholder_token` error | Old client calling stub connect | Use `/api/v1/auth/meta/connect` flow only |

---

## References

- API routes: `apps/api/src/routes/auth/meta.ts`
- Callback URL helper: `apps/api/src/routes/auth/oauthState.ts` → `oauthCallbackUrl()`
- Encryption: `apps/api/src/security/oauth-token-crypto.ts`
- Env schema: `apps/api/src/config/index.ts`
- Manual sellability matrix: `qa/v1-sellability-manual-checklist.md` (Meta OAuth row)
