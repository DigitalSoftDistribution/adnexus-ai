#!/usr/bin/env bash
# Coolify deploy-status feedback hook for Cursor/Claude Code PostToolUse.
#
# Fires after a `git push` Bash tool call. Resolves the Coolify app(s) matching
# the just-pushed repo+branch, polls Coolify until the deployment matching the
# pushed commit reaches a terminal status (or the timeout window expires), then
# emits a JSON system-reminder to the agent's next-turn context.
#
# Wired via project/global .claude/settings.json under PostToolUse.Bash.
# Receives JSON on stdin: { tool_name, tool_input: { command, ... }, ... }
#
# Output: ONE compact JSON object printed to stdout wrapped in <system-reminder>.
# Claude Code injects it verbatim as a system-reminder in the next agent turn.
#
# Notes on Coolify v4 REST quirks (verified 2026-06-08):
#   - Applications: identifier is `.uuid`. `.id` is null at top level.
#   - Deployments: `/api/v1/deployments` returns ONLY currently-active rows
#     (queued + in_progress). Finished/failed are dropped from this list.
#     Linkage from deploy → app is `.application_name`, not `application_id`
#     (the int id is internal and not exposed by the apps endpoint).
#   - So: poll the active list, match on (application_name in our app set)
#     AND (commit prefix == head_sha[0:12]). Catch the terminal flip in the
#     same poll cycle (Coolify keeps the row briefly before pruning).

set -u
INPUT_JSON=$(cat 2>/dev/null || echo '{}')

TOOL_NAME=$(echo "$INPUT_JSON" | jq -r '.tool_name // empty' 2>/dev/null)
[ "$TOOL_NAME" = "Bash" ] || exit 0

CMD=$(echo "$INPUT_JSON" | jq -r '.tool_input.command // empty' 2>/dev/null)
echo "$CMD" | grep -qE 'git +push' || exit 0
echo "$CMD" | grep -q -- '--dry-run' && exit 0

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
HEAD_SHA=$(git rev-parse HEAD 2>/dev/null)
REMOTE_URL=$(git remote get-url origin 2>/dev/null)
if [ -z "$BRANCH" ] || [ -z "$HEAD_SHA" ] || [ -z "$REMOTE_URL" ]; then
  exit 0
fi

REPO=$(echo "$REMOTE_URL" | sed -E 's|.*[:/]([^/]+/[^/]+)(\.git)?$|\1|' | sed 's|\.git$||')
[ -z "$REPO" ] && exit 0

COOLIFY_BASE_URL="${COOLIFY_BASE_URL:-https://coolify.softblaze.net}"
COOLIFY_ACCESS_TOKEN="${COOLIFY_ACCESS_TOKEN:-}"
[ -f "$HOME/.coolify-mcp.env" ] && source "$HOME/.coolify-mcp.env" 2>/dev/null
[ -f /home/devops/.coolify-mcp.env ] && source /home/devops/.coolify-mcp.env 2>/dev/null
[ -f /etc/llm-cli/keys.sh ] && source /etc/llm-cli/keys.sh 2>/dev/null

emit() {
  local payload=$1
  echo "<system-reminder>"
  echo "Coolify deploy-status feedback (post-git-push hook):"
  echo "$payload"
  echo "</system-reminder>"
  exit 0
}

if [ -z "$COOLIFY_ACCESS_TOKEN" ]; then
  emit "$(jq -nc \
    --arg repo "$REPO" --arg branch "$BRANCH" --arg sha "$HEAD_SHA" \
    '{event:"coolify_deploy_check",status:"skipped",repo:$repo,branch:$branch,head_sha:$sha,reason:"COOLIFY_ACCESS_TOKEN missing"}')"
fi

curl_api() {
  curl -sS -m 15 -H "Authorization: Bearer $COOLIFY_ACCESS_TOKEN" "$COOLIFY_BASE_URL$1"
}

# Resolve matching apps (repo + branch, with case-insensitive repo match)
APPS_JSON=$(curl_api /api/v1/applications 2>/dev/null)
if [ -z "$APPS_JSON" ] || ! echo "$APPS_JSON" | jq -e '.[0]' >/dev/null 2>&1; then
  emit "$(jq -nc --arg repo "$REPO" --arg branch "$BRANCH" --arg sha "$HEAD_SHA" \
    '{event:"coolify_deploy_check",status:"api_unavailable",repo:$repo,branch:$branch,head_sha:$sha,hint:"Coolify REST returned empty/error; check coolify.softblaze.net"}')"
fi

MATCHES=$(echo "$APPS_JSON" | jq -c --arg repo "$REPO" --arg branch "$BRANCH" \
  '[.[] | select(
    (.git_repository // "" | ascii_downcase | contains($repo | ascii_downcase)) and
    ((.git_branch // "") == $branch)
  ) | {uuid, name, fqdn}]' 2>/dev/null)

if [ -z "$MATCHES" ] || [ "$(echo "$MATCHES" | jq 'length')" = "0" ]; then
  # PR-preview fallback: when no app directly tracks this branch (the common
  # case for feature branches), find parent apps that track `main` for this
  # repo, resolve the PR number via `gh`, and emit the deterministic preview
  # URL pattern: https://pr-<N>-<app>.previews.softblaze.net.
  #
  # Without this branch, every feature-branch push returned `no_app_found` —
  # which is technically true (Coolify's preview-deployment apps are dynamic
  # per PR, not branch-tracked) but useless to the agent. Now we hand back
  # the URL the preview WILL be served at, so the agent can poll/visit it.
  PARENT_APPS=$(echo "$APPS_JSON" | jq -c --arg repo "$REPO" \
    '[.[] | select(
      (.git_repository // "" | ascii_downcase | contains($repo | ascii_downcase)) and
      ((.git_branch // "") == "main")
    ) | {uuid, name, fqdn}]' 2>/dev/null)

  PR_NUMBER=$(gh pr view --json number --jq .number 2>/dev/null)

  if [ -n "$PR_NUMBER" ] && [ "$(echo "$PARENT_APPS" | jq 'length')" -gt 0 ]; then
    PREVIEW_RESULTS=$(echo "$PARENT_APPS" | jq -c \
      --arg pr "$PR_NUMBER" \
      '[.[] | {
        app: .name,
        app_uuid: .uuid,
        pr: ($pr | tonumber),
        fqdn: ("https://pr-" + $pr + "-" + .name + ".previews.softblaze.net"),
        status: "preview_pending",
        deployment_id: "",
        elapsed_s: 0,
        error_excerpt: ""
      }]')

    emit "$(echo "$PREVIEW_RESULTS" | jq -c \
      --arg repo "$REPO" --arg branch "$BRANCH" --arg sha "$HEAD_SHA" --arg pr "$PR_NUMBER" \
      '{event:"coolify_deploy_check",repo:$repo,branch:$branch,head_sha:$sha,pr_number:($pr|tonumber),apps:.,hint:"PR-preview URLs. Coolify spawns the preview container on PR open/sync; allow ~3-7 min after first push. Visit the fqdn to verify the change is live — DO NOT hit the production URL (lizensa.com/distivo.com) to check pushed code."}')"
  fi

  emit "$(jq -nc --arg repo "$REPO" --arg branch "$BRANCH" --arg sha "$HEAD_SHA" \
    '{event:"coolify_deploy_check",status:"no_app_found",repo:$repo,branch:$branch,head_sha:$sha,hint:"No Coolify app tracks this branch AND no PR exists for it. Either: (a) open a PR with `gh pr create` to trigger a preview deploy, or (b) check that a parent app tracks main for this repo."}')"
fi

# Build a comma-separated list of app names for client-side filtering
APP_NAMES=$(echo "$MATCHES" | jq -r '[.[].name] | join(",")')

# Poll loop: each iteration fetches the active deployments and looks for
# (commit startswith head_sha) AND (application_name in our app set).
# Total wall-clock cap ~115s (15s sleep + 100s schedule). Keeps total
# under ~2 min so the agent gets feedback within one turn boundary.
# For longer/still-running builds, the hook emits status=queued or
# in_progress with deployment_id; agent can re-check via /deploy-status.
SCHEDULE=(5 5 10 10 15 15 20 20)
RESULTS="[]"
APP_COUNT=$(echo "$MATCHES" | jq 'length')

# Track per-app state across poll iterations
declare -A SEEN_STATUS
declare -A SEEN_DEPLOY_ID
declare -A TERMINAL_REACHED

# Webhook + debouncer settle delay
sleep 15
ELAPSED=15

for delay in "${SCHEDULE[@]}"; do
  DEPLOYS=$(curl_api "/api/v1/deployments" 2>/dev/null)
  if [ -z "$DEPLOYS" ]; then
    sleep "$delay"
    ELAPSED=$((ELAPSED + delay))
    continue
  fi

  # Normalize: Coolify sometimes returns array, sometimes object-keyed
  DEPLOYS_ARR=$(echo "$DEPLOYS" | jq -c '
    if type == "array" then . else (to_entries | map(.value)) end
  ' 2>/dev/null)

  for i in $(seq 0 $((APP_COUNT - 1))); do
    APP_NAME=$(echo "$MATCHES" | jq -r ".[$i].name")
    [ "${TERMINAL_REACHED[$APP_NAME]:-}" = "1" ] && continue

    # Find a deploy whose commit starts with our head_sha AND application_name == our app
    MATCH=$(echo "$DEPLOYS_ARR" | jq -c --arg sha "$HEAD_SHA" --arg name "$APP_NAME" \
      '[.[] | select(.application_name == $name) | select(.commit and (.commit | startswith($sha[0:12])))] | sort_by(.created_at) | last' 2>/dev/null)

    if [ -n "$MATCH" ] && [ "$MATCH" != "null" ]; then
      STATUS=$(echo "$MATCH" | jq -r '.status // "?"')
      DEPLOY_ID=$(echo "$MATCH" | jq -r '.id // ""')
      SEEN_STATUS[$APP_NAME]=$STATUS
      SEEN_DEPLOY_ID[$APP_NAME]=$DEPLOY_ID
      case "$STATUS" in
        finished|failed|cancelled-by-user|cancelled)
          TERMINAL_REACHED[$APP_NAME]=1
          ;;
      esac
    fi
  done

  # Exit early if EVERY matched app has hit terminal
  ALL_TERMINAL=1
  for i in $(seq 0 $((APP_COUNT - 1))); do
    APP_NAME=$(echo "$MATCHES" | jq -r ".[$i].name")
    [ "${TERMINAL_REACHED[$APP_NAME]:-}" = "1" ] || ALL_TERMINAL=0
  done
  [ "$ALL_TERMINAL" = "1" ] && break

  sleep "$delay"
  ELAPSED=$((ELAPSED + delay))
done

# Build results
RESULTS="[]"
for i in $(seq 0 $((APP_COUNT - 1))); do
  APP_NAME=$(echo "$MATCHES" | jq -r ".[$i].name")
  APP_UUID=$(echo "$MATCHES" | jq -r ".[$i].uuid")
  APP_FQDN=$(echo "$MATCHES" | jq -r ".[$i].fqdn // \"\"")
  STATUS="${SEEN_STATUS[$APP_NAME]:-not_seen}"
  DEPLOY_ID="${SEEN_DEPLOY_ID[$APP_NAME]:-}"

  # For failed deploys, grab the build log error excerpt via the deployment endpoint
  ERROR_EXCERPT=""
  if [ "$STATUS" = "failed" ] && [ -n "$DEPLOY_ID" ]; then
    LOG_JSON=$(curl_api "/api/v1/deployments/$DEPLOY_ID" 2>/dev/null)
    ERROR_EXCERPT=$(echo "$LOG_JSON" | jq -r '.logs // ""' \
      | tr ',' '\n' | grep -iE '"output":' \
      | sed -E 's/.*"output":"([^"]*)".*/\1/' \
      | grep -iE 'error|fail|✘|fatal|ERROR' \
      | tail -30 | head -c 2500)
  fi

  RESULTS=$(echo "$RESULTS" | jq -c \
    --arg app "$APP_NAME" --arg uuid "$APP_UUID" --arg fqdn "$APP_FQDN" \
    --arg status "$STATUS" --arg did "$DEPLOY_ID" --arg err "$ERROR_EXCERPT" \
    --argjson elapsed "$ELAPSED" \
    '. + [{app:$app, app_uuid:$uuid, fqdn:$fqdn, status:$status, deployment_id:$did, elapsed_s:$elapsed, error_excerpt:$err}]')
done

SUMMARY=$(echo "$RESULTS" | jq -c \
  --arg repo "$REPO" --arg branch "$BRANCH" --arg sha "$HEAD_SHA" \
  '{event:"coolify_deploy_check", repo:$repo, branch:$branch, head_sha:$sha, apps:.}')

emit "$SUMMARY"
