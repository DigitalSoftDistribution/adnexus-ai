#!/bin/bash
# AdNexus API — Quick Integration Test
BASE="http://localhost:3001"
PASS=0; FAIL=0
pass() { echo "  PASS $1"; PASS=$((PASS+1)); }
fail() { echo "  FAIL $1 — $2"; FAIL=$((FAIL+1)); }

echo "═══ AdNexus API Integration Test ═══"

# 1. Health
echo "--- Health ---"
curl -sf "$BASE/health" >/dev/null && pass "Health" || fail "Health" "$?"

# 2. Public Audit (POST)
echo "--- Public Audit ---"
R=$(curl -s -X POST "$BASE/api/v1/public/audit" -H "Content-Type: application/json" -d '{"ad_account_id":"act_123","platform":"meta"}')
echo "$R" | grep -q '"audit_id"' && pass "Public audit POST" || fail "Public audit POST" "$R"

# 3. Register + get token
echo "--- Auth ---"
R=$(curl -s -X POST "$BASE/api/v1/auth/signup" -H "Content-Type: application/json" \
  -d "{\"email\":\"qa-$(date +%s)@adnexus.ai\",\"password\":\"AdNexus123!\",\"name\":\"QA Tester\",\"workspace_name\":\"QA WS\"}")
TOKEN=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('token',''))" 2>/dev/null)
[ -n "$TOKEN" ] && pass "Sign-up + token" || fail "Sign-up" "$R"

# 4. Authenticated routes
if [ -n "$TOKEN" ]; then
  AUTH="Authorization: Bearer $TOKEN"
  echo "--- Authenticated (token: ${TOKEN:0:20}...) ---"
  
  curl -sf "$BASE/api/v1/auth/me" -H "$AUTH" >/dev/null && pass "GET /auth/me" || fail "GET /auth/me" "$?"
  curl -sf "$BASE/api/v1/campaigns" -H "$AUTH" >/dev/null && pass "GET /campaigns" || fail "GET /campaigns" "$?"
  curl -sf "$BASE/api/v1/drafts" -H "$AUTH" >/dev/null && pass "GET /drafts" || fail "GET /drafts" "$?"
  curl -sf "$BASE/api/v1/alerts" -H "$AUTH" >/dev/null && pass "GET /alerts" || fail "GET /alerts" "$?"
  curl -sf "$BASE/api/v1/settings" -H "$AUTH" >/dev/null && pass "GET /settings" || fail "GET /settings" "$?"
  curl -sf "$BASE/api/v1/billing/plans" -H "$AUTH" >/dev/null && pass "GET /billing/plans" || fail "GET /billing/plans" "$?"
fi

# 5. WireMock Ad APIs
echo "--- WireMock ---"
curl -s -X POST http://beast:9085/v14/customers/1234567890/googleAds:search -H "Content-Type: application/json" -d '{"query":"SELECT campaign.id FROM campaign"}' | grep -q results && pass "WireMock Google Ads" || fail "WireMock Google" "$?"
curl -s http://beast:9085/open_api/v1.3/campaign/get/ | grep -q TikTok && pass "WireMock TikTok Ads" || fail "WireMock TikTok" "$?"
curl -s http://beast:9085/v2/adaccounts/ad-12345/campaigns | grep -q Snap && pass "WireMock Snapchat Ads" || fail "WireMock Snapchat" "$?"

echo "═══ Results: $PASS passed, $FAIL failed ═══"
[ "$FAIL" -eq 0 ]
