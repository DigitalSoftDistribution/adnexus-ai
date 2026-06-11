# Stripe Billing Setup — QA Runbook (SB-3234 B2)

**Audience:** hi@fbeeg.io (Stripe dashboard + Coolify env setup)  
**Last verified:** 2026-06-11 on main preview (`adnexus-api.apps.softblaze.net`)  
**Do not paste live Stripe keys into GitHub, Linear, or chat.** Set values only in Coolify.

---

## Preview URLs

| Surface | URL |
|---|---|
| Web (main) | `https://adnexus-ai.apps.softblaze.net` |
| API (main) | `https://adnexus-api.apps.softblaze.net` |
| PR preview web | `https://pr-<N>-adnexus-ai.apps.softblaze.net` |
| PR preview API | `https://pr-<N>-adnexus-api.apps.softblaze.net` |

Wait for `coolify/adnexus-api` GitHub commit status **success** before treating responses as current.

---

## 1. Coolify env vars (`adnexus-api`)

Set on Coolify app **`adnexus-api`** (production + preview scopes). Source: PR #132 billing code (`apps/api/src/config/index.ts`, `apps/api/src/services/stripe.ts`).

### Required for checkout + webhooks

| Variable | Example shape | Purpose |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_…` or `sk_live_…` | Stripe API client; must start with `sk_` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` | Verifies `Stripe-Signature` on incoming webhooks |
| `STRIPE_PRICE_STARTER` | `price_…` | Maps Starter plan → Stripe Price ID |
| `STRIPE_PRICE_GROWTH` | `price_…` | Maps Growth plan |
| `STRIPE_PRICE_PRO` | `price_…` | Maps Pro plan |
| `STRIPE_PRICE_ENTERPRISE` | `price_…` | Maps Enterprise plan (optional if not sold yet) |

**Alias form (either works):** `STRIPE_PRICE_ID_STARTER`, `STRIPE_PRICE_ID_GROWTH`, `STRIPE_PRICE_ID_PRO`, `STRIPE_PRICE_ID_ENTERPRISE`.

### Recommended companion vars (not Stripe-prefixed)

| Variable | Purpose |
|---|---|
| `FRONTEND_URL` | Checkout/portal return URLs default to `{FRONTEND_URL}/dashboard/billing?…` |
| `CORS_ORIGINS` | Must include the web origin (`https://adnexus-ai.apps.softblaze.net` and PR previews if used) |

### Optional (validated in config, not required for API billing)

| Variable | Purpose |
|---|---|
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_…` / `pk_live_…` — reserved for future client-side Stripe.js; billing UI today uses server-side Checkout redirects only |

### Readiness rules (from code)

| Check | Condition |
|---|---|
| `stripeConfigured` | `STRIPE_SECRET_KEY` set and starts with `sk_` |
| `billingEnabled` / checkout ready | `stripeConfigured` **and** at least one price env var maps to a plan |
| Upgrade/downgrade/portal/checkout | Require `billingEnabled` (503/validation error otherwise) |
| Webhook handler | Requires `billingEnabled` **and** `STRIPE_WEBHOOK_SECRET` |

**Current main preview (2026-06-11):** none of the `STRIPE_*` vars are set on Coolify → **not configured** state below.

### Coolify commands (Beast)

```bash
# List current keys (values hidden)
coolify env adnexus-api

# Set each var (use test keys first)
coolify env-set adnexus-api STRIPE_SECRET_KEY sk_test_REPLACE_ME
coolify env-set adnexus-api STRIPE_WEBHOOK_SECRET whsec_REPLACE_ME
coolify env-set adnexus-api STRIPE_PRICE_STARTER price_REPLACE_ME
coolify env-set adnexus-api STRIPE_PRICE_GROWTH price_REPLACE_ME
coolify env-set adnexus-api STRIPE_PRICE_PRO price_REPLACE_ME

# One deploy after all vars are saved — do not rapid-fire push/deploy
coolify deploy adnexus-api --force
```

---

## 2. Stripe Dashboard — webhook endpoint

Register **one** webhook endpoint pointing at the **API host** (not the Next.js web app):

```
https://adnexus-api.apps.softblaze.net/api/v1/billing/webhook
```

Notes:

- Route is mounted **before** JSON body parsing so Stripe signature verification receives the raw body (`apps/api/src/index.ts`).
- Path is under **`/api/v1/billing/webhook`** even when the product UI calls **`/api/v2/billing/*`** for authenticated billing reads/mutations.
- For PR previews, use `https://pr-<N>-adnexus-api.apps.softblaze.net/api/v1/billing/webhook` only if you create a separate Stripe test endpoint for that PR.

### Events to enable (minimum set handled in code)

Subscribe to these event types in Stripe Dashboard (or Stripe CLI forward):

| Event | Effect |
|---|---|
| `checkout.session.completed` | Activates subscription after Checkout |
| `customer.subscription.updated` | Syncs plan/status/period dates |
| `customer.subscription.deleted` | Downgrades workspace to free |
| `invoice.payment_failed` | Marks subscription `past_due`, audit log |
| `invoice.payment_succeeded` | Clears `past_due` back to `active` |
| `customer.subscription.trial_will_end` | Audit log (14-day trial configured in Checkout) |

After creating the endpoint, copy the **Signing secret** (`whsec_…`) into Coolify as `STRIPE_WEBHOOK_SECRET`, then redeploy `adnexus-api` once.

### Stripe CLI (local / staging replay)

```bash
stripe listen --forward-to https://adnexus-api.apps.softblaze.net/api/v1/billing/webhook
# Use the printed whsec_… in Coolify for that environment only
```

---

## 3. QA credentials (preview)

| User | Email | Password | Role |
|---|---|---|---|
| QA owner | `qa-owner@softblaze.net` | `AdNexus-QA-2026!` | owner |

Sign in via API:

```bash
API=https://adnexus-api.apps.softblaze.net
TOKEN=$(curl -sS -X POST "$API/api/v1/auth/signin" \
  -H 'Content-Type: application/json' \
  -d '{"email":"qa-owner@softblaze.net","password":"AdNexus-QA-2026!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")
echo "token acquired (${#TOKEN} chars)"
```

Web UI: `https://adnexus-ai.apps.softblaze.net/en/auth/signin` → billing at `/en/dashboard/billing`.

---

## 4. API verification — not configured vs ready

Run after deploy settles. Replace `$TOKEN` from step 3.

### A. Not configured (current main preview — 2026-06-11)

**`GET /api/v2/billing`** (auth required — works without Stripe):

```bash
curl -sS "$API/api/v2/billing" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

Expected highlights:

- `success: true`
- `data.plan`: `"free"`
- `data.status`: `"inactive"`
- `data.stripeCustomerId`: `null`
- Free-tier credit limits present (`creativesTotal: 5`, etc.)

**`GET /api/v2/billing/plans`**:

```bash
curl -sS "$API/api/v2/billing/plans" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

Expected:

```json
{
  "success": true,
  "data": {
    "billingEnabled": false,
    "stripeConfigured": false,
    "plans": [],
    "message": "Billing checkout is not configured. Set Stripe secret and price mapping environment variables before enabling upgrades."
  }
}
```

**Mutations blocked:**

```bash
curl -sS -X POST "$API/api/v2/billing/upgrade" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"plan":"growth"}' | python3 -m json.tool
# → VALIDATION_ERROR "Billing checkout is not configured"
```

**Webhook without Stripe config:**

```bash
curl -sS -o /dev/null -w "%{http_code}\n" -X POST "$API/api/v1/billing/webhook" \
  -H 'Content-Type: application/json' -d '{}'
# → 503 (billing not configured)
```

**Web UI:** Billing page loads; upgrade/downgrade controls hidden/disabled; banner explains billing is not configured (`BillingContent.tsx` reads `billingEnabled`).

### B. Ready (after Coolify Stripe vars + redeploy)

Re-run the same calls. Expected changes:

| Signal | Ready value |
|---|---|
| `GET /api/v2/billing/plans` → `stripeConfigured` | `true` |
| `GET /api/v2/billing/plans` → `billingEnabled` | `true` |
| `GET /api/v2/billing/plans` → `plans` | Non-empty array with `plan`, `priceId`, `credits` per configured tier |
| `GET /api/v2/billing/plans` → `message` | `null` |
| `POST /api/v2/billing/upgrade` `{ "plan": "growth" }` | `200` with `checkoutUrl` (no subscription yet) or subscription update payload |
| Stripe Dashboard → webhook test | Delivery **2xx** (not 503) when `STRIPE_WEBHOOK_SECRET` matches |

**Web UI ready:** Upgrade banner + plan buttons active; successful upgrade opens Stripe Checkout in new tab/window.

### C. Unauthenticated guard (both states)

```bash
curl -sS -o /dev/null -w "%{http_code}\n" "$API/api/v2/billing"
# → 401
```

---

## 5. End-to-end sellability checklist (hi@fbeeg.io)

1. **Stripe Dashboard (Test mode)**
   - Create Products/Prices for Starter, Growth, Pro (match internal plan slugs).
   - Copy each `price_…` into Coolify `STRIPE_PRICE_*` vars.
   - Create webhook endpoint → URL in section 2 → copy `whsec_…`.
   - Copy `sk_test_…` secret key.

2. **Coolify `adnexus-api`**
   - Set all vars from section 1 (test keys only until launch sign-off).
   - Confirm `FRONTEND_URL=https://adnexus-ai.apps.softblaze.net`.
   - Single `coolify deploy adnexus-api --force`; wait for `coolify/adnexus-api` success.

3. **API smoke (section 4B)**
   - Sign in as `qa-owner@softblaze.net`.
   - Confirm `billingEnabled: true` and plans list populated.
   - `POST /api/v2/billing/upgrade` with `{ "plan": "growth" }` → receive Checkout URL.

4. **Checkout + webhook**
   - Complete Stripe test Checkout (card `4242…`).
   - Confirm webhook deliveries succeed in Stripe Dashboard.
   - Re-fetch `GET /api/v2/billing` → plan/status updated, `stripeCustomerId` set.

5. **Portal + downgrade (optional)**
   - `POST /api/v2/billing/portal` → opens Customer Portal.
   - `POST /api/v2/billing/downgrade` `{ "plan": "starter" }` → proration rules per PR #132.

6. **Sign-off**
   - Attach curl output or screenshots to Linear **SB-3234**.
   - Do **not** switch to live keys until product approves go-live.

---

## Reference

- Billing routes: `apps/api/src/routes/billing.ts`, v2 mount `apps/api/src/interface/http/routes/billing.ts`
- Stripe service: `apps/api/src/services/stripe.ts`
- Upgrade/downgrade UI: PR #132 / SB-3229 (`apps/web/components/billing/BillingContent.tsx`)
- Related manual matrix: `qa/v1-sellability-manual-checklist.md` (billing rows P0)
