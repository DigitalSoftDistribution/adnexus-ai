# WireMock Coolify setup (Option B)

Internal `adnexus-wiremock` service + platform URL env overrides on `adnexus-api`. No public WireMock route.

## 1. Create `adnexus-wiremock` (internal)

**Preferred:** Dockerfile build pack (stubs baked from repo).

```bash
coolify POST /api/v1/applications/private-github-app --data '{
  "name": "adnexus-wiremock",
  "build_pack": "dockerfile",
  "git_repository": "DigitalSoftDistribution/adnexus-ai",
  "git_branch": "main",
  "dockerfile_location": "/apps/api/Dockerfile.wiremock",
  "base_directory": "/",
  "ports_exposes": "8080",
  "server_uuid": "dymnrogsji2vdmfxrq8ecz69",
  "environment_uuid": "fbmhkdkjvsd3x7przn85lv97",
  "project_uuid": "w8wz9u8ga21mizcyupba0iub",
  "github_app_uuid": "fth5c41kftx5jl65k4ptxsj9",
  "instant_deploy": false
}'
```

After first deploy, remove any auto-assigned public domain in Coolify UI (Service → Domains → clear). `__admin` must not be on Traefik.

**Alternative:** Docker Compose at `/docker-compose.wiremock-coolify.yml` with `build_pack: dockercompose`.

## 2. Revert `adnexus-api` to Dockerfile (if on compose sidecar)

```bash
coolify PATCH /api/v1/applications/x10mxscm633zyl2wlxam9eix --data '{
  "build_pack": "dockerfile",
  "dockerfile_location": "/apps/api/Dockerfile",
  "docker_compose_location": null,
  "base_directory": "/",
  "ports_exposes": "3000"
}'
```

## 3. Platform URL overrides on `adnexus-api`

```bash
for kv in \
  "META_GRAPH_URL=http://adnexus-wiremock:8080" \
  "GOOGLE_ADS_API_URL=http://adnexus-wiremock:8080/v16" \
  "GOOGLE_OAUTH_URL=http://adnexus-wiremock:8080/google/oauth2/auth" \
  "GOOGLE_TOKEN_URL=http://adnexus-wiremock:8080/token" \
  "GOOGLE_TOKEN_INFO_URL=http://adnexus-wiremock:8080/tokeninfo" \
  "TIKTOK_API_URL=http://adnexus-wiremock:8080/open_api/v1.3" \
  "SNAP_API_BASE_URL=http://adnexus-wiremock:8080/v1" \
  "SNAP_OAUTH_BASE_URL=http://adnexus-wiremock:8080/snap/oauth2"
do
  key="${kv%%=*}"; val="${kv#*=}"
  coolify env-set adnexus-api "$key" "$val"
done
coolify deploy adnexus-wiremock --force
coolify deploy adnexus-api --force
```

## 4. Verify

From API container:

```bash
curl -fsS http://adnexus-wiremock:8080/__admin/health
```

QA sync (owner JWT + harness key):

```bash
POST /api/v2/integrations/mock-traffic/seed
POST /api/v2/integrations/accounts/{id}/sync  # expect liveSynced:true, campaignsSynced>0
```

Local harness against preview WireMock (only if port-forwarded or on VPS):

```bash
WIREMOCK_BASE_URL=http://adnexus-wiremock:8080 pnpm wiremock:platform
```

See also: [WIREMOCK_PREVIEW_DEPLOY.md](./WIREMOCK_PREVIEW_DEPLOY.md)
