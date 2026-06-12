# V1 Launch Checklist — Meta OAuth + Stripe Billing

**Audience:** hi@fbeeg.io (Meta Developer Console, Stripe Dashboard, Coolify secrets)  
**Last updated:** 2026-06-12  
**Do not paste live secrets into GitHub, Linear, or chat.** Set values only in Coolify.

Detailed runbooks: [`qa/meta-oauth-setup.md`](./meta-oauth-setup.md) · [`qa/stripe-billing-setup.md`](./stripe-billing-setup.md) · [`qa/v1-sellability-manual-checklist.md`](./v1-sellability-manual-checklist.md)

---

## Preview URLs (main)

| Surface | URL |
|---|---|
| Web | `https://adnexus-ai.apps.softblaze.net` |
| API | `https://adnexus-api.apps.softblaze.net` |

Wait for `coolify/adnexus-api` and `coolify/adnexus-ai` GitHub commit status **success** before treating responses as current.

---

## Phase 0 — Human setup (Coolify + third-party consoles)

### Meta OAuth (`adnexus-api` Coolify app)

| Step | Action |
|---|---|
| 1 | Meta Developer Console → **Valid OAuth Redirect URI** (exact): `https://adnexus-ai.apps.softblaze.net/api/v1/auth/meta/callback` |
| 2 | Copy **App ID** + **App Secret** from Meta → Coolify (never commit) |
| 3 | Set Coolify env vars on **`adnexus-api`**: |

| Variable | Required | Value / notes |
|---|---|---|
| `META_APP_ID` | **Yes** | Numeric App ID |
| `META_APP_SECRET` | **Yes** | App Secret |
| `META_API_VERSION` | No | Default `v19.0` |
| `FRONTEND_URL` | **Yes** | `https://adnexus-ai.apps.softblaze.net` — drives `redirect_uri` |
| `ENCRYPTION_MASTER_KEY` | **Yes** | Already set (encrypts tokens at rest) |
| `CORS_ORIGINS` | **Yes** | Must include web origin |

**Do not set on production:** `META_ACCESS_TOKEN` (dev/test fallback only).

Connect entry: `GET https://adnexus-api.apps.softblaze.net/api/v1/auth/meta/connect?workspace_id={uuid}`  
Callback (Meta redirects here): `https://adnexus-ai.apps.softblaze.net/api/v1/auth/meta/callback` → Next.js rewrites to API.

```bash
coolify env-set adnexus-api META_APP_ID '<app-id>'
coolify env-set adnexus-api META_APP_SECRET '<app-secret>'
coolify env-set adnexus-api FRONTEND_URL 'https://adnexus-ai.apps.softblaze.net'
coolify deploy adnexus-api --force   # once after all vars saved
```

### Stripe Billing (`adnexus-api` Coolify app)

| Step | Action |
|---|---|
| 1 | Stripe Dashboard → **Webhook endpoint** (API host, not web): `https://adnexus-api.apps.softblaze.net/api/v1/billing/webhook` |
| 2 | Enable events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `invoice.payment_succeeded`, `customer.subscription.trial_will_end` |
| 3 | Copy **Signing secret** (`whsec_…`) + **Secret key** (`sk_test_…`) + Price IDs → Coolify |

| Variable | Required | Purpose |
|---|---|---|
| `STRIPE_SECRET_KEY` | **Yes** | Must start with `sk_` |
| `STRIPE_WEBHOOK_SECRET` | **Yes** | Verifies `Stripe-Signature` |
| `STRIPE_PRICE_STARTER` | **Yes** | `price_…` for Starter |
| `STRIPE_PRICE_GROWTH` | **Yes** | `price_…` for Growth |
| `STRIPE_PRICE_PRO` | **Yes** | `price_…` for Pro |
| `STRIPE_PRICE_ENTERPRISE` | No | Optional tier |
| `FRONTEND_URL` | **Yes** | Checkout/portal return URLs |
| `CORS_ORIGINS` | **Yes** | Must include web origin |

Alias form also works: `STRIPE_PRICE_ID_STARTER`, etc.

```bash
coolify env-set adnexus-api STRIPE_SECRET_KEY sk_test_REPLACE_ME
coolify env-set adnexus-api STRIPE_WEBHOOK_SECRET whsec_REPLACE_ME
coolify env-set adnexus-api STRIPE_PRICE_STARTER price_REPLACE_ME
coolify env-set adnexus-api STRIPE_PRICE_GROWTH price_REPLACE_ME
coolify env-set adnexus-api STRIPE_PRICE_PRO price_REPLACE_ME
coolify deploy adnexus-api --force   # once after all vars saved
```

### Web app (`adnexus-ai` Coolify app) — no Meta/Stripe secrets

| Variable | Value |
|---|---|
| `API_URL` | `https://adnexus-api.apps.softblaze.net` |
| `NEXT_PUBLIC_API_URL` | Same as `API_URL` |

---

## Phase 1 — Verify curls (after deploy)

Set shell vars once:

```bash
API=https://adnexus-api.apps.softblaze.net
TOKEN=$(curl -sS -X POST "$API/api/v1/auth/signin" \
  -H 'Content-Type: application/json' \
  -d '{"email":"qa-owner@softblaze.net","password":"<QA_PASSWORD>"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")
WS=$(curl -sS "$API/api/v1/auth/me" -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['workspace']['id'])")
```

### Meta — not configured (before secrets)

```bash
curl -sS "$API/api/v1/auth/meta/connect?workspace_id=$WS" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-workspace-id: $WS" \
  -H "Accept: application/json" | python3 -m json.tool
# Expected: code MISSING_META_OAUTH_CONFIG
```

### Meta — ready (after Coolify secrets)

```bash
curl -sS "$API/api/v1/auth/meta/connect?workspace_id=$WS" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-workspace-id: $WS" \
  -H "Accept: application/json" | python3 -m json.tool
# Expected: success=true, data.redirectUrl with redirect_uri=
#   https://adnexus-ai.apps.softblaze.net/api/v1/auth/meta/callback (URL-encoded)
```

Browser E2E: Dashboard → Integrations → Connect Meta → consent → land on `/dashboard/integrations?platform=meta&status=connected`.

### Stripe — not configured (before secrets)

```bash
curl -sS "$API/api/v2/billing/plans" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
# Expected: billingEnabled=false, stripeConfigured=false, plans=[]

curl -sS -o /dev/null -w "%{http_code}\n" -X POST "$API/api/v1/billing/webhook" \
  -H 'Content-Type: application/json' -d '{}'
# Expected: 503
```

### Stripe — ready (after Coolify secrets)

```bash
curl -sS "$API/api/v2/billing/plans" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
# Expected: billingEnabled=true, stripeConfigured=true, plans non-empty

curl -sS -X POST "$API/api/v2/billing/upgrade" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"plan":"growth"}' | python3 -m json.tool
# Expected: 200 with checkoutUrl

curl -sS -o /dev/null -w "%{http_code}\n" -X POST "$API/api/v1/billing/webhook" \
  -H 'Content-Type: application/json' -d '{}'
# Expected: 400 (missing signature) — NOT 503
```

Browser E2E: Billing → Upgrade → Stripe test Checkout (`4242…`) → webhook 2xx in Stripe Dashboard → `GET /api/v2/billing` shows updated plan.

### Auth guard (both integrations)

```bash
curl -sS -o /dev/null -w "%{http_code}\n" "$API/api/v2/billing"
# Expected: 401 (unauthenticated)
```

---

## Phase 2 — Go/no-go sign-off

| # | Item | Owner | Pass? |
|---|---|---|---|
| 1 | Meta redirect URI registered in Developer Console | hi@fbeeg.io | ☐ |
| 2 | `META_APP_ID` + `META_APP_SECRET` set on `adnexus-api` Coolify | hi@fbeeg.io | ☐ |
| 3 | Meta connect curl returns `redirectUrl` with correct callback | QA | ☐ |
| 4 | Meta OAuth browser flow completes; ad account visible in Integrations | QA | ☐ |
| 5 | Stripe webhook registered at `/api/v1/billing/webhook` | hi@fbeeg.io | ☐ |
| 6 | All `STRIPE_*` vars set on `adnexus-api` Coolify | hi@fbeeg.io | ☐ |
| 7 | `billingEnabled: true` + plans populated (curl) | QA | ☐ |
| 8 | Test Checkout + webhook delivery 2xx | QA | ☐ |
| 9 | Meta App Review / Live mode (for non-tester users) | hi@fbeeg.io | ☐ |
| 10 | Manual matrix P0 rows in `v1-sellability-manual-checklist.md` | QA | ☐ |

Attach curl output or screenshots to Linear **SB-3234**. Use **test** keys until product approves go-live.

---

## Quick reference

| Integration | Coolify app | External console | Callback / webhook URL |
|---|---|---|---|
| Meta OAuth | `adnexus-api` | Meta Developer Console | `https://adnexus-ai.apps.softblaze.net/api/v1/auth/meta/callback` |
| Stripe Billing | `adnexus-api` | Stripe Dashboard | `https://adnexus-api.apps.softblaze.net/api/v1/billing/webhook` |
