# Spec: Enable real draft execution (P0-A)

> Status date: 2026-06-13. Owner-area: API / platform. Addresses the #1 v1
> blocker in `../V1_PUNCH_LIST.md`.
>
> **Implementation status:** Phase 1 (Meta `status_change` pause/resume behind a
> per-workspace flag) is **DONE** — `ExecuteDraftUseCase` + `MetaPlatformWriteService`
> + Container wiring + config flag + 10 unit tests. The remaining phases below
> (budget writes, Google adapter, rollback, live-sandbox e2e) are still spec-only
> and need live platform write-scope credentials.

## Problem

`ExecuteDraftUseCase` (`apps/api/src/application/use-cases/draft/ExecuteDraftUseCase.ts`)
short-circuits with `DraftExecutionDisabledError` for every approved draft. So
the core promise — "AI drafts → human approves → it goes live" — is unfulfilled.

## What already exists (reuse, don't rebuild)

- **Port:** `apps/api/src/application/ports/IPlatformWriteService.ts`
  (`PlatformWriteContext`, `PlatformWriteResult`).
- **Meta adapter:** `apps/api/src/infrastructure/platform/MetaPlatformWriteService.ts`
  — `pauseCampaign` / `resumeCampaign` via `updateMetaCampaign`, per-account token
  resolution, structured failure reasons. **Budget/creative/structural writes are
  deliberately not implemented yet.**
- **Google write fns:** `apps/api/src/services/google-api.ts` —
  `createGoogleCampaign`, `updateGoogleCampaign`, `deleteGoogleCampaign`,
  `createGoogleAdGroup`, `createGoogleAd` exist but are **untested and not routed
  through a write service.**
- **Audit logger:** `IAuditLogger` is already threaded into the use-case and logs
  blocked/disabled attempts with before/after-style metadata.
- **Capability gate:** `AdPlatformCapabilities.ts` — `meta.canWriteCampaigns:true`,
  all others `false`.

## Scope for v1 (intentionally narrow + reversible)

Enable **only** the safe, reversible writes that already have an adapter:

1. **Meta** — `pause` / `resume` of a campaign (already implemented in the
   adapter; just needs wiring + flag).
2. **Meta** — campaign **daily-budget change** (new adapter method; reversible by
   storing the prior value).

Explicitly **out of scope for v1:** creative writes, ad-set structural changes,
Google writes (kept behind capability flag until the adapter + tests land),
TikTok/Snap (mock-only).

## Design

### 1. Feature flag (per-workspace, default OFF)

Add `platform_execution_enabled` to workspace settings (default `false`). Gate at
the top of `ExecuteDraftUseCase`:

- flag `false` → keep returning `DraftExecutionDisabledError` (today's behavior).
- flag `true` → proceed to the execution path below.

This lets us pilot with design-partner workspaces without a global cutover.

### 2. Execution path in `ExecuteDraftUseCase`

```
preconditions: role ∈ {owner,admin,editor}; draft.status === 'approved';
               workspace.platform_execution_enabled === true;
               capability[draft.platform].canWriteCampaigns === true
1. Resolve IPlatformWriteService for draft.platform; if none → unsupported error.
2. Build PlatformWriteContext (adAccountId, platformCampaignId from the draft).
3. Capture "before" state (current status / current budget) for rollback.
4. Dispatch by draft.changeType:
     - status_change  → pause/resume
     - budget_change  → setDailyBudget(new) (new adapter method)
5. On PlatformWriteResult.applied === true:
     - mark draft 'executed', persist appliedAt + before/after in changeDetail
     - audit log action_category 'draft_executed' with {before, after}
6. On applied === false:
     - mark draft 'failed', persist reason, audit 'draft_execution_failed'
     - return a typed error carrying result.reason/message
```

### 3. Idempotency + concurrency

- Use the draft row as the idempotency key: only `approved` → `executed` is a
  legal transition; re-running an `executed` draft is a no-op success.
- Wrap the status transition in a conditional update
  (`WHERE status='approved'`) so two concurrent executes can't double-apply.

### 4. Rollback

- Store `before` in `draft.changeDetail.execution.before`.
- Add `RevertDraftUseCase` that re-applies `before` via the same write service
  and audits `draft_reverted`. (Phase 2 — not required for the pilot, but the
  `before` capture in step 3 must land now so revert is possible later.)

### 5. New Meta adapter method

`setDailyBudget(ctx, amountMinorUnits): Promise<PlatformWriteResult>` — calls
`updateMetaCampaign(platformCampaignId, token, { daily_budget })`. Validate the
amount against plan/budget guardrails before dispatch.

## Test plan

- **Unit (vitest):** `ExecuteDraftUseCase` with a fake `IPlatformWriteService`:
  flag-off path, non-approved path, unsupported-platform path, applied-true →
  executed + audit, applied-false → failed + audit, idempotent re-run.
- **Adapter (wiremock):** extend the existing Meta harness
  (`docker-compose.wiremock.yml`, `test(wiremock)` from PR #127) with stubs for
  status + budget writes, asserting the outbound Graph API call shape.
- **e2e:** signup → connect Meta (sandbox) → create draft → approve → execute →
  assert live status flips and audit row exists. Gated on a sandbox token in CI
  secrets; skipped when absent.

## Rollout

1. Land code with flag default OFF — zero behavior change in prod.
2. Enable for 1–2 internal/design-partner workspaces; watch audit + error rates.
3. Promote Meta status+budget to GA; flip
   `AdPlatformCapabilities.meta.canWriteCampaigns` messaging accordingly.
4. Repeat the pattern for Google once `GooglePlatformWriteService` + tests land.

## Acceptance criteria

- Approved Meta status/budget draft applies to the live (sandbox) account behind
  the per-workspace flag.
- Before/after captured; audit log records `draft_executed` with the diff.
- Flag OFF preserves today's `DRAFT_EXECUTION_DISABLED` response exactly.
- All new use-case branches covered by vitest; wiremock asserts the API call.
