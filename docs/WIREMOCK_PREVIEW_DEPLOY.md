# WireMock on Coolify preview

Preview runs **API only** (Dockerfile build pack) by default. WireMock stubs are **local/CI-only** unless a sidecar is wired.

## Option A — Docker Compose sidecar (blocked on VPS Coolify 2026-06-13)

`docker-compose.preview.yml` adds API + internal WireMock. **Coolify injects host port `3000:3000` for the routed service**, which collides with orphaned preview containers → deploy fails with `address already in use`. Do **not** switch adnexus-api to compose until Coolify supports expose-only routing or orphans are cleaned.

Files remain in repo for future Coolify fix; see PR #178 / #180.

## Option B — Separate WireMock service + env overrides (recommended)

1. Create internal Coolify app `adnexus-wiremock` (docker image `wiremock/wiremock:3.10.0`, **no public domain**).
2. Mount `apps/api/tests/wiremock` stubs; command: `--global-response-templating --disable-gzip`.
3. Keep adnexus-api on **Dockerfile** build pack; set env on adnexus-api:

```
META_GRAPH_URL=http://adnexus-wiremock:8080
GOOGLE_ADS_API_URL=http://adnexus-wiremock:8080/v16
GOOGLE_OAUTH_URL=http://adnexus-wiremock:8080/google/oauth2/auth
GOOGLE_TOKEN_URL=http://adnexus-wiremock:8080/token
GOOGLE_TOKEN_INFO_URL=http://adnexus-wiremock:8080/tokeninfo
TIKTOK_API_URL=http://adnexus-wiremock:8080/open_api/v1.3
SNAP_API_BASE_URL=http://adnexus-wiremock:8080/v1
SNAP_OAUTH_BASE_URL=http://adnexus-wiremock:8080/snap/oauth2
```

4. Redeploy adnexus-api; verify from API container: `curl -fsS http://adnexus-wiremock:8080/__admin/health`.
5. Re-run QA:
   - `POST /api/v2/integrations/mock-traffic/seed` (DB seed, harness key)
   - `POST /api/v2/integrations/accounts/{id}/sync` — expect `liveSynced: true` and `campaignsSynced > 0`

## Local parity

```bash
pnpm wiremock:up
WIREMOCK_BASE_URL=http://localhost:9085 pnpm wiremock:smoke
WIREMOCK_BASE_URL=http://localhost:9085 pnpm wiremock:platform   # after PR #127 merge
```

## Safety

- No public WireMock or `__admin` route.
- Mock-traffic DB seed remains gated by `MOCK_TRAFFIC_HARNESS_*` + owner/admin JWT.
