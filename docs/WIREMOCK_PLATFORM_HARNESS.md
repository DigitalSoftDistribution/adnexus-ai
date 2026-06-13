# WireMock external platform harness

This harness lets the V2 dashboard, API, workers, and MCP integration streams exercise Meta, Google Ads, TikTok Ads, and Snapchat Ads flows without real platform secrets.

## What exists now

- `docker-compose.wiremock.yml` runs WireMock on host port `9085` by default. Override with `WIREMOCK_HOST_PORT` when another local harness already uses that port.
- `apps/api/tests/wiremock/mappings/adnexus-v2-platforms.json` contains deterministic stubs for:
  - Meta OAuth, accounts, campaigns, ad sets, ads, insights, create/update campaign.
  - Google OAuth/token info, `googleAds:search`, and `googleAds:mutate`.
  - TikTok OAuth, advertisers, campaigns, ad groups, ads, reports, create/update/status endpoints.
  - Snapchat OAuth, organizations, ad accounts, campaigns, ad squads, ads, stats, create/update endpoints.
- API service clients accept env-configured base URLs, so local/preview can point at WireMock instead of production platform APIs.
- `scripts/wiremock-smoke.mjs` verifies the core mappings are loaded.

## Local runbook

```bash
# Default host port is 9085. If another WireMock instance already owns 9085:
WIREMOCK_HOST_PORT=9087 pnpm wiremock:up

pnpm wiremock:smoke
WIREMOCK_BASE_URL=http://localhost:9087 pnpm wiremock:platform
```

| Variable | Default | Purpose |
|---|---|---|
| `WIREMOCK_HOST_PORT` | `9085` | Host port mapped to WireMock container `8080` |
| `WIREMOCK_BASE_URL` | `http://localhost:9085` | Base URL for smoke + platform integration scripts |

Use these API env overrides when testing against local WireMock (substitute your port if not `9085`):

```bash
META_GRAPH_URL=http://localhost:9085
GOOGLE_ADS_API_URL=http://localhost:9085/v16
GOOGLE_OAUTH_URL=http://localhost:9085/google/oauth2/auth
GOOGLE_TOKEN_URL=http://localhost:9085/token
GOOGLE_TOKEN_INFO_URL=http://localhost:9085/tokeninfo
TIKTOK_API_URL=http://localhost:9085/open_api/v1.3
SNAP_API_BASE_URL=http://localhost:9085/v1
SNAP_OAUTH_BASE_URL=http://localhost:9085/snap/oauth2
```

### What `wiremock:platform` covers

Runs `apps/api/tests/wiremock/run-platform-integration.ts` against live stubs — no database or Redis required:

- Meta OAuth token refresh (`fb_exchange_token`)
- Google OAuth token refresh (form-urlencoded, as used by `refreshGoogleToken`)
- Google token info validation
- Meta ad accounts, campaigns, insights (metrics-sync read path)
- Google Ads search campaigns + insights (metrics-sync read path)

Full `MetaPlatformSyncService` / `metrics-sync` worker end-to-end requires Postgres + Redis + seeded `ad_accounts` rows; use PR #75 mock-traffic harness for DB-backed preview QA.

## Coolify preview design

Run WireMock as an internal preview-only service alongside the API container. Do not expose WireMock publicly and do not route `__admin` through Traefik.

Recommended Coolify preview env for the API service:

```bash
META_GRAPH_URL=http://wiremock:8080
GOOGLE_ADS_API_URL=http://wiremock:8080/v16
GOOGLE_OAUTH_URL=http://wiremock:8080/google/oauth2/auth
GOOGLE_TOKEN_URL=http://wiremock:8080/token
GOOGLE_TOKEN_INFO_URL=http://wiremock:8080/tokeninfo
TIKTOK_API_URL=http://wiremock:8080/open_api/v1.3
SNAP_API_BASE_URL=http://wiremock:8080/v1
SNAP_OAUTH_BASE_URL=http://wiremock:8080/snap/oauth2
```

Keep the database seeding harness separate from WireMock and gated:

```bash
MOCK_TRAFFIC_HARNESS_ENABLED=true
MOCK_TRAFFIC_HARNESS_CONTEXT=preview
MOCK_TRAFFIC_HARNESS_KEY=<private random value>
```

Only enable those three values in branch previews or test environments. Do not set `MOCK_TRAFFIC_HARNESS_CONTEXT=preview` on live production. The seed endpoint still requires an authenticated owner/admin and the private harness key.

Seed the database (owner/admin JWT + harness key):

```bash
curl -X POST "$API_BASE/api/v2/integrations/mock-traffic/seed" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-mock-traffic-key: $MOCK_TRAFFIC_HARNESS_KEY" \
  -d '{}'
```

`x-mock-traffic-harness-key` is accepted as an alias for the same value. You can also pass `harnessKey` in the JSON body.

## Scenario variants

WireMock has a first low-ROAS Meta insight variant via `?mock_variant=low_roas`. The current service clients do not pass scenario selectors yet, so full dashboard scenario switching should be a follow-up. Prefer a single internal scenario header/query convention across all platform streams, for example `X-AdNexus-Mock-Scenario` or `mock_variant`.

Recommended variants for the next slice:

- `baseline`: healthy multi-platform account.
- `high_spend`: spend spike, normal ROAS.
- `low_roas`: normal spend, weak conversion value.
- `auth_expired`: platform returns 401/expired token shape.
- `rate_limited`: platform returns 429/rate-limit shape.
- `empty_account`: valid account with no campaigns.

## Safety constraints

- WireMock is a read/write API simulator only; it must not seed application database rows by itself.
- Public preview access to WireMock and `__admin` must remain blocked.
- Database seed/reset endpoints must remain authenticated, role-gated, preview/test-context gated, and protected by `MOCK_TRAFFIC_HARNESS_KEY`.
- Mock tokens in mappings are fake deterministic strings and must never be replaced with real credentials.

## Remaining Linear-ready work

1. Add a Coolify preview service definition or platform template for the WireMock sidecar once the deployment stream finalizes the preview topology.
2. Add scenario selection from API/MCP test calls into platform clients and WireMock mappings for the variants above.
3. Add dashboard/API/MCP integration tests that run against `docker-compose.wiremock.yml` in the preview pipeline.
4. Add a protected preview-only reset endpoint if database cleanup becomes necessary; require owner/admin, harness key, and preview/test context.
