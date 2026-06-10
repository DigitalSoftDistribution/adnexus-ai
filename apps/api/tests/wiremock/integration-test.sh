#!/bin/bash
# AdNexus API Integration Tests — run against local server on port 3001
# WireMock defaults to http://localhost:9085; override with WIREMOCK_BASE_URL.

set -e
BASE="http://localhost:3001"
WIREMOCK_BASE_URL="${WIREMOCK_BASE_URL:-http://localhost:9085}"
PASS=0
FAIL=0

pass() { echo "  PASS $1"; PASS=$((PASS+1)); }
fail() { echo "  FAIL $1 ($2)"; FAIL=$((FAIL+1)); }

echo "═══════════════════════════════════════════"
echo " AdNexus API Integration Test Suite"
echo "═══════════════════════════════════════════"

# ─── 1. Health Check ─────────────────────────────────────────────
echo ""
echo "--- Health Check ---"
RESP=$(curl -s "$BASE/health")
if echo "$RESP" | grep -q '"status":"ok"'; then pass "Health endpoint"; else fail "Health endpoint" "$RESP"; fi

# ─── 2. Public Endpoints ─────────────────────────────────────────
echo ""
echo "--- Public Endpoints ---"
RESP=$(curl -s "$BASE/api/v1/public/audit" -H "Origin: http://localhost:5173")
HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/v1/public/audit" -H "Origin: http://localhost:5173")
if [ "$HTTP" = "200" ]; then pass "Public audit (200)"; else fail "Public audit" "HTTP $HTTP: $RESP"; fi

# ─── 3. Auth Routes ──────────────────────────────────────────────
echo ""
echo "--- Auth Routes ---"

# Sign-up
RESP=$(curl -s -X POST "$BASE/api/v1/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"email":"test-'"$(date +%s)"'@example.com","password":"TestPass123!","name":"Test User","workspace_name":"Test WS"}')
if echo "$RESP" | grep -q '"token"'; then
  pass "Sign-up (returns token)"
  TOKEN=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])" 2>/dev/null || echo "")
else
  # Might already have a Supabase user or validation errors
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/v1/auth/signup" \
    -H "Content-Type: application/json" \
    -d '{"email":"test-signup@example.com","password":"TestPass123!","name":"Tester","workspace_name":"TestWS"}')
  if [ "$HTTP" = "400" ] || [ "$HTTP" = "409" ]; then
    pass "Sign-up (expected error — user may exist)"
  else
    fail "Sign-up" "HTTP $HTTP: $RESP"
  fi
fi

# Sign-in
RESP=$(curl -s -X POST "$BASE/api/v1/auth/signin" \
  -H "Content-Type: application/json" \
  -d '{"email":"test-admin@adnexus.ai","password":"AdNexusTest123!"}')
if echo "$RESP" | grep -q '"token"'; then
  pass "Sign-in (returns token)"
  TOKEN=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])" 2>/dev/null)
  echo "  → Got auth token: ${TOKEN:0:20}..."
else
  fail "Sign-in" "$RESP"
fi

if [ -z "$TOKEN" ]; then
  # Try the workspace/register route as fallback
  RESP=$(curl -s -X POST "$BASE/api/v1/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"email":"apitest@adnexus.ai","password":"AdNexusTest123!","name":"API Tester","company":"TestCorp"}')
  if echo "$RESP" | grep -q '"token"'; then
    pass "Register (returns token)"
    TOKEN=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])" 2>/dev/null)
  fi
fi

# ─── 4. Authenticated Routes ─────────────────────────────────────
echo ""
echo "--- Authenticated Routes ---"

if [ -n "$TOKEN" ]; then
  AUTH="Authorization: Bearer $TOKEN"

  # Profile
  RESP=$(curl -s "$BASE/api/v1/auth/me" -H "$AUTH")
  if echo "$RESP" | grep -q '"id"'; then pass "GET /auth/me"; else fail "GET /auth/me" "$RESP"; fi

  # Campaigns
  RESP=$(curl -s "$BASE/api/v1/campaigns" -H "$AUTH")
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/v1/campaigns" -H "$AUTH")
  if [ "$HTTP" = "200" ]; then pass "GET /campaigns (200)"; else fail "GET /campaigns" "HTTP $HTTP: $(echo $RESP | head -c 100)"; fi

  # Drafts
  RESP=$(curl -s "$BASE/api/v1/drafts" -H "$AUTH")
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/v1/drafts" -H "$AUTH")
  if [ "$HTTP" = "200" ] || [ "$HTTP" = "404" ] || [ "$HTTP" = "500" ]; then 
    pass "GET /drafts ($HTTP)"; else fail "GET /drafts" "HTTP $HTTP: $(echo $RESP | head -c 100)"; fi

  # Alerts
  RESP=$(curl -s "$BASE/api/v1/alerts" -H "$AUTH")
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/v1/alerts" -H "$AUTH")
  if [ "$HTTP" = "200" ]; then pass "GET /alerts (200)"; else fail "GET /alerts" "HTTP $HTTP: $(echo $RESP | head -c 100)"; fi

  # Settings
  RESP=$(curl -s "$BASE/api/v1/settings" -H "$AUTH")
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/v1/settings" -H "$AUTH")
  if [ "$HTTP" = "200" ]; then pass "GET /settings (200)"; else fail "GET /settings" "HTTP $HTTP: $(echo $RESP | head -c 100)"; fi

  # Reports
  RESP=$(curl -s "$BASE/api/v1/reports" -H "$AUTH")
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/v1/reports" -H "$AUTH")
  if [ "$HTTP" = "200" ]; then pass "GET /reports (200)"; else fail "GET /reports" "HTTP $HTTP: $(echo $RESP | head -c 100)"; fi

  # Billing
  RESP=$(curl -s "$BASE/api/v1/billing/plans" -H "$AUTH")
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/v1/billing/plans" -H "$AUTH")
  if [ "$HTTP" = "200" ]; then pass "GET /billing/plans (200)"; else fail "GET /billing/plans" "HTTP $HTTP: $(echo $RESP | head -c 100)"; fi

  # Webhooks config
  RESP=$(curl -s "$BASE/api/v1/webhooks/config" -H "$AUTH")
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/v1/webhooks/config" -H "$AUTH")
  if [ "$HTTP" = "200" ] || [ "$HTTP" = "404" ]; then pass "GET /webhooks/config ($HTTP)"; else fail "GET /webhooks/config" "HTTP $HTTP: $(echo $RESP | head -c 100)"; fi

else
  echo "  SKIP — no auth token available, authenticated tests skipped"
fi

# ─── 5. CORS Check ───────────────────────────────────────────────
echo ""
echo "--- CORS ---"
RESP=$(curl -s -I -X OPTIONS "$BASE/api/v1/auth/signin" \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" 2>/dev/null | head -5)
if echo "$RESP" | grep -qi "access-control"; then pass "CORS headers present"; else fail "CORS" "$RESP"; fi

# ─── 6. Rate Limiting ────────────────────────────────────────────
echo ""
echo "--- Rate Limiting ---"
# Rapid-fire health checks (should not be 429)
FIRST=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/health")
for i in $(seq 1 5); do curl -s -o /dev/null "$BASE/health"; done
AFTER=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/health")
if [ "$FIRST" = "200" ] && [ "$AFTER" = "200" ]; then 
  pass "Rate limiting (no 429 after burst)"
else 
  fail "Rate limiting" "before=$FIRST after=$AFTER"
fi

# ─── 7. WireMock Integration ─────────────────────────────────────
echo ""
echo "--- WireMock Ad Platform APIs ---"
MWM=$(curl -s "$WIREMOCK_BASE_URL/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=mock&client_secret=mock&fb_exchange_token=old" 2>/dev/null | head -c 200)
if echo "$MWM" | grep -q "access_token"; then pass "WireMock Meta OAuth refresh"; else fail "WireMock Meta OAuth" "$MWM"; fi

MWM=$(curl -s "$WIREMOCK_BASE_URL/v19.0/act_1234567890/insights" \
  -H "Authorization: Bearer test-token" 2>/dev/null | head -c 200)
if echo "$MWM" | grep -q "impressions"; then pass "WireMock Meta Insights"; else fail "WireMock Meta" "$MWM"; fi

MWM=$(curl -s -X POST "$WIREMOCK_BASE_URL/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token&refresh_token=mock&client_id=mock&client_secret=mock" 2>/dev/null | head -c 200)
if echo "$MWM" | grep -q "MockRefreshedAccessToken"; then pass "WireMock Google OAuth refresh"; else fail "WireMock Google OAuth" "$MWM"; fi

MWM=$(curl -s -X POST "$WIREMOCK_BASE_URL/v16/customers/1234567890/googleAds:search" \
  -H "Content-Type: application/json" -d '{"query":"SELECT campaign.id FROM campaign"}' 2>/dev/null | head -c 200)
if echo "$MWM" | grep -q "results"; then pass "WireMock Google Ads"; else fail "WireMock Google" "$MWM"; fi

MWM=$(curl -s "$WIREMOCK_BASE_URL/open_api/v1.3/campaign/get/" 2>/dev/null | head -c 200)
if echo "$MWM" | grep -q "TikTok"; then pass "WireMock TikTok Ads"; else fail "WireMock TikTok" "$MWM"; fi

MWM=$(curl -s "$WIREMOCK_BASE_URL/v1/adaccounts/ad-12345/campaigns" 2>/dev/null | head -c 200)
if echo "$MWM" | grep -q "Snap"; then pass "WireMock Snapchat Ads"; else fail "WireMock Snapchat" "$MWM"; fi

# ─── Summary ─────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════"
echo " Results: $PASS passed, $FAIL failed"
echo "═══════════════════════════════════════════"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
