# WireMock on Coolify preview

Preview today runs **API only** (Dockerfile build pack). WireMock is **local/CI-only** unless this sidecar is applied.

## Apply in Coolify (adnexus-api preview)

1. Switch preview build pack to **Docker Compose** and point at `docker-compose.preview.yml` in repo root.
2. Keep Traefik routing on the `api` service only (`ports: 3000`). Do **not** expose `wiremock`.
3. Set existing preview env vars unchanged; platform URL overrides are in compose for the `api` service.
4. Redeploy preview; verify from API container: `curl -fsS http://wiremock:8080/health`.
5. Re-run QA:
   - `POST /api/v2/integrations/mock-traffic/seed` (DB seed, harness key)
   - `POST /api/v2/integrations/accounts/{id}/sync` — expect `liveSynced: true` and `campaignsSynced > 0` when stubs match mock tokens.

## Local parity

```bash
pnpm wiremock:up
WIREMOCK_BASE_URL=http://localhost:9085 pnpm wiremock:smoke
WIREMOCK_BASE_URL=http://localhost:9085 pnpm wiremock:platform   # after PR #127 merge
```

## Safety

- No public WireMock or `__admin` route.
- Mock-traffic DB seed remains gated by `MOCK_TRAFFIC_HARNESS_*` + owner/admin JWT.
