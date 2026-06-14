# Spec: Email verification on signup (P0-C)

> Status date: 2026-06-14. Owner-area: API / auth. The one genuinely-remaining
> P0 from `../V1_PUNCH_LIST.md` after the 2026-06-14 re-audit (P0-B and P0-D
> turned out already done). Mirrors the existing Supabase-OTP password-reset
> flow, so **no new token table is required**.

## Problem

Signup (`apps/api/src/routes/auth.ts` `POST /auth/signup`) creates the Supabase
user with `email_confirm: true` (auto-confirmed) and never sets or checks
`users.email_verified` (the column exists and defaults `false`). No verification
email is sent and nothing gates on verification — an abuse vector and a
table-stakes gap for a paid SaaS, especially for the EU target market.

## What already exists (reuse)

- **Supabase OTP links.** Password reset uses
  `supabase.auth.admin.generateLink({ type: 'recovery' })` to mint a token and
  `supabase.auth.verifyOtp({ type: 'recovery', token_hash })` to consume it. The
  signup/confirmation equivalent is `type: 'signup'` (or `'email'`).
- **Email service.** `apps/api/src/services/email.ts` sends typed templates
  (`password_reset`, `team_invite`, …) over SendGrid/SMTP, with a JSON dev
  transport fallback. Add a `email_verification` template alongside these.
- **`users.email_verified`** boolean column (migration `001_initial_schema.sql`).
- **Frontend** already has an `/auth` route group; add a `verify-email` page that
  POSTs the token (mirrors `reset-password`).

## Design

### 1. Signup change (non-blocking verification)

Keep `email_confirm: true` so users can sign in immediately (don't regress the
current UX), but track *our* verification separately:

- On signup, after the user/workspace are created, generate a confirmation link
  via `generateLink({ type: 'signup', email })`, extract the `token_hash`, and
  send the `email_verification` email with a link to
  `${APP_URL}/auth/verify-email?token=<token_hash>`.
- Leave `users.email_verified = false` (its default).
- Failure to send the email must **not** fail signup (best-effort, logged) —
  same posture as the reset flow.

### 2. Verify endpoint

`POST /auth/verify-email { token }`:

1. `supabase.auth.verifyOtp({ type: 'signup'|'email', token_hash: token })`.
2. On success, `UPDATE users SET email_verified = true WHERE id = <user>`.
3. Audit `email_verified`.
4. Idempotent: an already-verified user returns success.

Add `POST /auth/resend-verification { email }` (no enumeration — identical
response whether or not the account exists), rate-limited like the reset flow.

### 3. Gate

Add a `requireVerifiedEmail` middleware that returns `403 EMAIL_NOT_VERIFIED`
when `users.email_verified === false`. Apply it to the **sensitive, outward-facing
mutations only** — billing checkout/portal and platform OAuth connect — NOT to
read paths or the dashboard, so unverified users can explore but can't spend or
connect. Source the flag from the JWT claims (add `emailVerified`) or a cheap
per-request lookup; prefer the claim to avoid an extra query.

### 4. Config

- Reuse `APP_URL` for link construction.
- Optional `REQUIRE_EMAIL_VERIFICATION` flag (default `true`) so the gate can be
  disabled for local/dev without email transport.

## Test plan

- **Unit (vitest):** `requireVerifiedEmail` — verified passes, unverified → 403;
  verify-email use case — valid token flips the flag + audits, invalid token →
  401, already-verified → idempotent success.
- **Route (jest):** signup sends an `email_verification` message on the dev JSON
  transport; `/auth/verify-email` flips `email_verified`.
- **Not CI-verifiable:** live Supabase `generateLink`/`verifyOtp` and real email
  delivery — verify on a deployed preview with Supabase + SendGrid configured.

## Acceptance criteria

- New signups receive a verification email (dev transport logs it).
- `POST /auth/verify-email` with a valid token sets `users.email_verified = true`.
- Billing and platform-connect endpoints return `403 EMAIL_NOT_VERIFIED` for an
  unverified user and succeed once verified.
- Signin/read/dashboard remain available to unverified users (non-blocking).
